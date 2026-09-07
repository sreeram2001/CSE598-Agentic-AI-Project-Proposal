import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();
        if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

        const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

        const audioStream = await client.textToSpeech.convert(voiceId, {
            text: text.slice(0, 800), // limit for speed
            modelId: "eleven_turbo_v2",
            voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
        });

        const chunks: Buffer[] = [];
        const reader = audioStream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }
        const audioBuffer = Buffer.concat(chunks);

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("Voice error:", error);
        return NextResponse.json({ error: "Failed to generate voice" }, { status: 500 });
    }
}
