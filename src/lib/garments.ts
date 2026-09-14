/**
 * @deprecated All garments and products are now served dynamically from the PostgreSQL database via productsApi in @/lib/api.
 */

export type Garment = {
  id?: string;
  name: string;
  type: string;
  image: string;
  dataAiHint?: string;
  price: number;
  rentPrice: number;
};

export const garments: Garment[] = [];
