import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { ReportsModule } from '../reports/reports.module';
import { CustomersModule } from '../customers/customers.module';
import { CategoriesModule } from '../categories/categories.module';
import { CartsModule } from '../carts/carts.module';
import { CacheModule } from '../../common/cache/cache.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), 'backend', '.env'),
        join(__dirname, '..', '..', '..', '.env'),
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? 'mongodb://localhost:27017/lbtechworks_analytics',
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        connectionFactory: (connection: { on: (e: string, cb: (err: Error) => void) => void }) => {
          connection.on('error', (err: Error) => {
            console.warn('[MongoDB] Connection error (analytics non-critical):', err.message);
          });
          return connection;
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    CacheModule,
    UsersModule,
    NotificationsModule,
    ProductsModule,
    OrdersModule,
    ReportsModule,
    CustomersModule,
    CategoriesModule,
    CartsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
