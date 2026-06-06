import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type LegacyProductRow = {
  legacyId: number;
  name: string;
  category: string;
  priceEuro: number;
  image: string;
  description: string;
  stock: number;
};

const apiBase = (process.env.API_PUBLIC_URL ?? 'http://localhost:3001').replace(/\/$/, '');

function imgUrl(relativeFromLegacyRoot: string) {
  const clean = relativeFromLegacyRoot.replace(/^\/+/, '');
  return `${apiBase}/shop-assets/${clean}`;
}

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrator' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: { name: 'MANAGER', description: 'Manager' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER', description: 'Standard user' },
  });

  const perms: Array<{ key: string; name: string; description: string }> = [
    { key: 'users.read',       name: 'Lexo Përdorues',    description: 'Lejo leximin e listës dhe profilit të përdoruesve' },
    { key: 'users.write',      name: 'Shkruaj Përdorues', description: 'Lejo krijimin dhe modifikimin e përdoruesve' },
    { key: 'products.read',    name: 'Lexo Produkte',     description: 'Lejo leximin e katalogut të produkteve' },
    { key: 'products.write',   name: 'Shkruaj Produkte',  description: 'Lejo krijimin dhe modifikimin e produkteve' },
    { key: 'orders.read',      name: 'Lexo Porosi',       description: 'Lejo leximin e listës dhe detajeve të porosive' },
    { key: 'orders.write',     name: 'Shkruaj Porosi',    description: 'Lejo modifikimin e statusit dhe porosive' },
    { key: 'customers.read',   name: 'Lexo Klientë',      description: 'Lejo leximin e listës së klientëve' },
    { key: 'customers.write',  name: 'Shkruaj Klientë',   description: 'Lejo krijimin dhe modifikimin e klientëve' },
    { key: 'categories.read',  name: 'Lexo Kategori',     description: 'Lejo leximin e kategorive të produkteve' },
    { key: 'categories.write', name: 'Shkruaj Kategori',  description: 'Lejo krijimin dhe modifikimin e kategorive' },
    { key: 'reports.read',     name: 'Lexo Raporte',      description: 'Lejo qasje në raportet dhe analizat e shitjeve' },
  ];

  for (const perm of perms) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, description: perm.description },
      create: { key: perm.key, name: perm.name, description: perm.description },
    });
  }

  const allPerms = await prisma.permission.findMany();
  for (const p of allPerms) {
    const existing = await prisma.rolePermission.findFirst({ where: { roleId: adminRole.id, permissionId: p.id } });
    if (!existing) await prisma.rolePermission.create({ data: { roleId: adminRole.id, permissionId: p.id } });
  }

  const usersReadPerm = await prisma.permission.findUnique({ where: { key: 'users.read' } });
  if (usersReadPerm) {
    const existingUR = await prisma.rolePermission.findFirst({ where: { roleId: userRole.id, permissionId: usersReadPerm.id } });
    if (!existingUR) await prisma.rolePermission.create({ data: { roleId: userRole.id, permissionId: usersReadPerm.id } });
  }

  const managerPermKeys = ['products.read', 'products.write', 'orders.read', 'orders.write', 'reports.read'];
  const managerPerms = await prisma.permission.findMany({ where: { key: { in: managerPermKeys } } });
  for (const p of managerPerms) {
    const existingMP = await prisma.rolePermission.findFirst({ where: { roleId: managerRole.id, permissionId: p.id } });
    if (!existingMP) await prisma.rolePermission.create({ data: { roleId: managerRole.id, permissionId: p.id } });
  }

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lbtechworks.local' },
    update: { fullName: 'Admin LB-Techworks', firstName: 'Admin', lastName: 'LB-Techworks', passwordHash },
    create: {
      email: 'admin@lbtechworks.local',
      fullName: 'Admin LB-Techworks',
      firstName: 'Admin',
      lastName: 'LB-Techworks',
      passwordHash,
    },
  });

  const globalSettings = [
    { key: 'site.name',          value: 'LB-Techworks',           description: 'Emri i faqes' },
    { key: 'site.tagline',       value: 'Teknologji e Lartë',     description: 'Slogani i faqes kryesore' },
    { key: 'site.contact_email', value: 'info@lbtechworks.local', description: 'Email-i i kontaktit' },
    { key: 'shop.currency',      value: 'EUR',                    description: 'Monedha e parazgjedhur e dyqanit' },
    { key: 'shop.tax_rate',      value: '0.18',                   description: 'Norma tatimore (TVSH 18%)' },
  ];

  for (const s of globalSettings) {
    const existing = await prisma.setting.findFirst({ where: { userId: null, key: s.key } });
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: s.value, description: s.description } });
    } else {
      await prisma.setting.create({ data: { userId: null, key: s.key, value: s.value, description: s.description } });
    }
  }

  const existingAdminRole = await prisma.userRole.findFirst({ where: { userId: admin.id, roleId: adminRole.id } });
  if (!existingAdminRole) await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });

  const phoneCat  = await prisma.category.upsert({ where: { name: 'Telefona' },       update: {}, create: { name: 'Telefona' } });
  const camCat    = await prisma.category.upsert({ where: { name: 'Kamera' },         update: {}, create: { name: 'Kamera' } });
  const audioCat  = await prisma.category.upsert({ where: { name: 'Pajisje Zërimi' }, update: {}, create: { name: 'Pajisje Zërimi' } });
  const accCat    = await prisma.category.upsert({ where: { name: 'Aksesorë' },       update: {}, create: { name: 'Aksesorë' } });

  async function seedProduct(sku: string, name: string, priceCents: number, categoryId: string, imageRelative: string, desc?: string, stockQty = 50) {
    const p = await prisma.product.upsert({
      where: { sku },
      update: { name, priceCents, description: desc ?? name },
      create: { sku, name, priceCents, description: desc ?? name },
    });
    await prisma.productCategory.upsert({ where: { productId_categoryId: { productId: p.id, categoryId } }, update: {}, create: { productId: p.id, categoryId } });
    await prisma.inventory.upsert({ where: { productId: p.id }, update: { quantity: stockQty }, create: { productId: p.id, quantity: stockQty } });
    const url = imgUrl(imageRelative);
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    await prisma.productImage.create({ data: { productId: p.id, url, sortOrder: 0 } });
    return p;
  }

  const legacyCandidates = [
    path.join(__dirname, 'data', 'legacy-products.json'),
    path.join(process.cwd(), 'prisma', 'data', 'legacy-products.json'),
  ];
  const legacyPath = legacyCandidates.find((c) => fs.existsSync(c));
  if (!legacyPath) throw new Error('Mungon prisma/data/legacy-products.json.');

  const legacyRows: LegacyProductRow[] = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  console.log(`[seed] ${legacyRows.length} produkte nga ${legacyPath}`);

  const categoryIdByLegacyName: Record<string, string> = {
    Telefona: phoneCat.id,
    Kamera: camCat.id,
    'Pajisje Zërimi': audioCat.id,
    Aksesorë: accCat.id,
    phones: camCat.id,
  };

  for (const row of legacyRows) {
    const categoryId = categoryIdByLegacyName[row.category];
    if (!categoryId) { console.warn(`[seed] Kategori e panjohur "${row.category}"`); continue; }
    await seedProduct(`LEGACY-${row.legacyId}`, row.name.trim(), Math.round(row.priceEuro * 100), categoryId, row.image, row.description.trim() || row.name.trim(), row.stock);
  }

  await prisma.shippingMethod.upsert({ where: { name: 'Standard' }, update: {}, create: { name: 'Standard', priceCents: 500 } });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });




