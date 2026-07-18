import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { text } = await request.json();

    // In a full local setup, this would spawn a python process:
    // const result = await execAsync(\`python3 /home/xupremix/Desktop/NLU/inference.py "\${text}"\`);
    // For now, we simulate the server-side inference.
    
    // Simulate model inference delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const EXAMPLES = [
      {
        text: "book a flight from boston to denver on tuesday",
        intent: "flight", confidence: 98.5,
        slots: [
          { word: "book", slot: null }, { word: "a", slot: null }, { word: "flight", slot: null },
          { word: "from", slot: null }, { word: "boston", slot: "fromloc.city_name" },
          { word: "to", slot: null }, { word: "denver", slot: "toloc.city_name" },
          { word: "on", slot: null }, { word: "tuesday", slot: "depart_date.day_name" },
        ]
      },
      {
        text: "what is the cheapest fare from new york to los angeles",
        intent: "airfare", confidence: 97.7,
        slots: [
          { word: "what", slot: null }, { word: "is", slot: null }, { word: "the", slot: null },
          { word: "cheapest", slot: "cost_relative" }, { word: "fare", slot: null },
          { word: "from", slot: null }, { word: "new", slot: "fromloc.city_name" },
          { word: "york", slot: "fromloc.city_name" }, { word: "to", slot: null },
          { word: "los", slot: "toloc.city_name" }, { word: "angeles", slot: "toloc.city_name" },
        ]
      },
      {
        text: "list the airports in chicago",
        intent: "airport", confidence: 99.2,
        slots: [
          { word: "list", slot: null }, { word: "the", slot: null },
          { word: "airports", slot: null }, { word: "in", slot: null },
          { word: "chicago", slot: "airport_name" },
        ]
      },
      {
        text: "show me flights leaving denver after 6pm",
        intent: "flight", confidence: 96.1,
        slots: [
          { word: "show", slot: null }, { word: "me", slot: null }, { word: "flights", slot: null },
          { word: "leaving", slot: null }, { word: "denver", slot: "fromloc.city_name" },
          { word: "after", slot: null }, { word: "6pm", slot: "depart_time.time" },
        ]
      },
      {
        text: "what airlines fly from dallas to miami",
        intent: "airline", confidence: 98.8,
        slots: [
          { word: "what", slot: null }, { word: "airlines", slot: null }, { word: "fly", slot: null },
          { word: "from", slot: null }, { word: "dallas", slot: "fromloc.city_name" },
          { word: "to", slot: null }, { word: "miami", slot: "toloc.city_name" },
        ]
      },
    ];

    const norm = text.trim().toLowerCase();
    const result = EXAMPLES.find(e => e.text.toLowerCase() === norm) || EXAMPLES[0];

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, stderr: `Server error: ${err.message}` }), { status: 500 });
  }
};
