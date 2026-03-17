export const config = {
    runtime: 'edge', // Use edge runtime for fast cold starts
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
            status: 405, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        const body = await req.json();
        const { messages, model = 'llama-3.3-70b-versatile' } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY; // Accessing safely from server ENV
        
        if (!GROQ_API_KEY) {
            console.error('[API] GROQ_API_KEY is not set in environment variables');
            return new Response(JSON.stringify({ error: 'API key not configured' }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 1.0,
                max_tokens: 1000
            })
        });

        const data = await groqRes.json();

        // If Groq returned an error (e.g. Rate Limit 429), log it and pass it back
        if (!groqRes.ok) {
            console.error('[API] Groq error:', data);
            return new Response(JSON.stringify({ 
                error: data.error?.message || 'Failed to fetch from Groq API',
                details: data
            }), { 
                status: groqRes.status, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        return new Response(JSON.stringify(data), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('[API] Fatal internal error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal Server Error',
            details: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
