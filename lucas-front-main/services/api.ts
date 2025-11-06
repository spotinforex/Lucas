import { ImagePayload, Message } from '../types';

// In development, Vite's proxy server handles requests to '/api'.
// In production, the frontend is static and communicates with the deployed backend service.
const API_BASE_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? '/api'
    : 'https://lucas-auth-215805715498.us-central1.run.app';


const getHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

async function handleResponse<T,>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json() as Promise<T>;
}

export const sendMessageStream = async (
    token: string,
    sessionId: string,
    message: string,
    image: ImagePayload | undefined,
    onChunk: (chunk: { text?: string; functionCall?: any; finishReason?: string, isError?: boolean, errorText?: string }) => void
) => {
    const payload: { session_id: string; message: string; image?: ImagePayload } = {
        session_id: sessionId,
        message: message,
    };
    if (image) {
        payload.image = image;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/message`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(payload)
        });

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            onChunk({ isError: true, errorText: `API Error: ${response.status} ${response.statusText} - ${errorText}` });
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const part = json.content?.parts?.[0];
                        if (part) {
                             onChunk({
                                text: part.text,
                                functionCall: part.functionCall,
                                finishReason: json.finishReason
                            });
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk:', e);
                    }
                }
            }
        }
    } catch (error: any) {
        onChunk({ isError: true, errorText: error.message });
    }
};


export const getSessionHistory = async (token: string, sessionId: string): Promise<{ state: object; events: Message[] }> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        method: 'GET',
        headers: getHeaders(token)
    });
    return handleResponse(response);
};

// Represents the session object from the API
interface ApiSessionResponse {
    id: string;
    state: object;
    // other fields are ignored
}

export const createOrUpdateSession = async (token: string, sessionId: string, state: object = {}): Promise<{ session_id: string; state: object }> => {
    const response = await fetch(`${API_BASE_URL}/session`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ session_id: sessionId, state })
    });
    const apiResponse = await handleResponse<ApiSessionResponse>(response);
    // Map the API's 'id' field to 'session_id' as expected by the function's return type.
    return { 
        session_id: apiResponse.id,
        state: apiResponse.state
    };
};

export const deleteSession = async (token: string, sessionId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    // DELETE might return 204 No Content
    if (response.status === 204) {
        return { message: `Session ${sessionId} deleted successfully` };
    }
    return handleResponse(response);
};
