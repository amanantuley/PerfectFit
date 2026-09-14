import { NextResponse } from 'next/server';

const backendUrl = (process.env.PERFECTFIT_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

function toStoreProduct(product: any) {
  return {
    id: String(product.id),
    name: product.name,
    type: product.type,
    image: product.image_url || '',
    dataAiHint: product.data_ai_hint || '',
    price: product.price,
    rentPrice: product.rent_price ?? product.price,
    description: product.description || '',
    rating: product.rating ?? 0,
    reviewCount: product.review_count ?? 0,
    inStock: product.in_stock,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = new URLSearchParams();
    const category = searchParams.get('category');
    if (category && category !== 'All') query.set('product_type', category);
    const search = searchParams.get('search');
    if (search) query.set('search', search);
    query.set('limit', '100');
    const response = await fetch(`${backendUrl}/products?${query}`, { cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ error: 'Catalog is currently unavailable' }, { status: response.status });
    const products = (await response.json()).map(toStoreProduct);
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
