import { NextResponse } from "next/server";
import Replicate from "replicate";
 
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
 
export async function POST(request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error(
      'The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it.'
    );
  }
 
  const {
    prompt,
    negative_prompt,
    num_inference_steps,
    guidance_scale,
    width,
    height
  } = await request.json();
 
  const prediction = await replicate.predictions.create({
    version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    input: {
      prompt: prompt,
      negative_prompt: negative_prompt || "",
      num_inference_steps: parseInt(num_inference_steps),
      guidance_scale: parseFloat(guidance_scale),
      width: parseInt(width),
      height: parseInt(height),
      scheduler: "DPMSolverMultistep",
      num_outputs: 1
    }
  });
 
  if (prediction?.error) {
    return NextResponse.json({ detail: prediction.error }, { status: 500 });
  }
 
  return NextResponse.json(prediction);
}
