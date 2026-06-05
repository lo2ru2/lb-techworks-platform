import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductViewDocument = ProductView & Document;

@Schema({ collection: 'product_views', timestamps: { createdAt: 'viewed_at', updatedAt: false } })
export class ProductView {
  @Prop({ required: true, index: true })
  productId!: string;

  @Prop({ required: true })
  productName!: string;

  @Prop({ index: true })
  userId?: string;

  @Prop()
  sessionId?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: Date.now, index: true })
  viewedAt!: Date;
}

export const ProductViewSchema = SchemaFactory.createForClass(ProductView);

// Compound index for analytics queries
ProductViewSchema.index({ productId: 1, viewedAt: -1 });
ProductViewSchema.index({ userId: 1, viewedAt: -1 });
