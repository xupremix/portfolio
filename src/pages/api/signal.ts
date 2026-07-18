import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // Return tracking parameters for the frontend canvas
    const data = {
      success: true,
      rmseLinear: 21.4,
      rmseCtrv: 3.9,
      tracks: [
        { id: 0, type: 'arc' },
        { id: 1, type: 'diagonal_curve' },
        { id: 2, type: 's_curve' }
      ]
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, stderr: err.message }), { status: 500 });
  }
};
