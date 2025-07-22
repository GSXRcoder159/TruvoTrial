import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { address } = await req.json();

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  const url = new URL('https://api.nationalflooddata.com/v3/data');
  url.searchParams.append('searchtype', 'addressparcel');
  url.searchParams.append('address', address);
  url.searchParams.append('elevation', 'true');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to fetch flood data' }, { status: response.status });
    }

    const data = await response.json();
    const floodZone = data.result?.['flood.s_fld_haz_ar']?.[0]?.fld_zone || 'Not found';
    
    return NextResponse.json({ floodZone });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
