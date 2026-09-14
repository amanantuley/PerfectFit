import { NextResponse } from 'next/server';

const backendUrl = (process.env.PERFECTFIT_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

function toStoreProduct(product: any) {
  return {
    id: String(product.id), name: product.name, type: product.type,
    image: product.image_url || '', dataAiHint: product.data_ai_hint || '',
    price: product.price, rentPrice: product.rent_price ?? product.price,
    description: product.description || '', rating: product.rating ?? 0,
    reviewCount: product.review_count ?? 0, inStock: product.in_stock,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = 'unknown';
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    const response = await fetch(`${backendUrl}/products/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (response.status === 404) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (!response.ok) return NextResponse.json({ error: 'Catalog is currently unavailable' }, { status: response.status });
    return NextResponse.json({ product: toStoreProduct(await response.json()) });
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
