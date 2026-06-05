import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SearchQueryDocument = SearchQuery & Document;

@Schema({ collection: 'search_queries', timestamps: { createdAt: 'searched_at', updatedAt: false } })
export class SearchQuery {
  @Prop({ index: true })
  query!: string;

  @Prop({ type: Object })
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  };

  @Prop({ default: 0 })
  resultCount!: number;

  @Prop({ index: true })
  userId?: string;

  @Prop()
  ip?: string;

  @Prop({ default: Date.now, index: true })
  searchedAt!: Date;
}

export const SearchQuerySchema = SchemaFactory.createForClass(SearchQuery);

SearchQuerySchema.index({ query: 'text' });
SearchQuerySchema.index({ searchedAt: -1 });
