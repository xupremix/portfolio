import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // In a full implementation, this might poll the local ASA Node socket server.
    // For the demo, we serve the phases from the backend.
    
    const PHASES = [
      { label: '📋 PDDL Planner computing optimal route…', msg: 'PDDL: (move agent r1 c1)\\n(pickup order)\\n(move agent r4 c6)\\n(deliver order)', pathFrom: {c:1,r:1}, pathTo: {c:6,r:4}, t: 0, duration: 80 },
      { label: '🧠 LLM Coordinator: "Confirm delivery to zone 3"', msg: 'LLM [Llama 3.3 70B]:\\n"Plan verified. Assign\\nBDI agent to order #42.\\nPriority: HIGH"', pathFrom: null, pathTo: null, t: 0, duration: 60 },
      { label: '🤖 BDI Agent moving to restaurant…', msg: 'BDI belief update:\\n- has_order: false\\n- target: restaurant(1,1)\\n- intention: PICKUP', pathFrom: {c:4,r:4}, pathTo: {c:1,r:1}, t: 0, duration: 100 },
      { label: '🤖 BDI Agent picked up order, en route…', msg: 'BDI belief update:\\n- has_order: true\\n- target: delivery(6,4)\\n- intention: DELIVER', pathFrom: {c:1,r:1}, pathTo: {c:6,r:4}, t: 0, duration: 110 },
      { label: '✅ Delivery complete! Agent returns to standby.', msg: 'BDI event fired:\\n- order #42 delivered\\n- reward: +10 pts\\n- returning to idle', pathFrom: {c:6,r:4}, pathTo: {c:4,r:4}, t: 0, duration: 70 },
    ];

    return new Response(JSON.stringify({ success: true, phases: PHASES }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, stderr: err.message }), { status: 500 });
  }
};
