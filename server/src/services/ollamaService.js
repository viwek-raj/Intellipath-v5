import { Ollama } from 'ollama';

// const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });
const ollama = new Ollama({
     host: "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
  },
 });

const generateResponse = async (prompt, model = 'gpt-oss:120b-cloud') => {
    try {
        const response = await ollama.chat({
            model: model,
            messages: [{ role: 'user', content: prompt }],
        });
        return response.message.content;
    } catch (error) {
        // console.error('Ollama Error:', error);
        throw new Error('Failed to generate response from Ollama');
    }
};

const generateCourseStructure = async (topic, level) => {
    const prompt = `Create a structured learning path for learning "${topic}" at a "${level}" level. 
    Return the response ONLY in valid JSON format with the following structure:
    {
        "title": "Course Title",
        "description": "Brief description",
        "modules": [
            {
                "title": "Module Title",
                "description": "What will be covered"
            }
        ]
    }
    Do not add any text before or after the JSON.`;

    return await generateResponse(prompt);
};

const generateLessonContent = async (topic, level, moduleTitle) => {
    const prompt = `Create a comprehensive lesson content for the module "${moduleTitle}" which is part of a course on "${topic}" at level "${level}".
    The content should be educational, easy to understand, and include examples where appropriate.
    Format the response in Markdown.`;

    return await generateResponse(prompt);
};

const generateQuiz = async (topic, level, moduleTitle) => {
    const prompt = `Create a quiz with 3 multiple-choice questions for the module "${moduleTitle}" (Course: "${topic}", Level: "${level}").
    Return the response ONLY in valid JSON format with the following structure:
    [
        {
            "question": "Question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0 // Index of the correct option (0-3)
        }
    ]
    Do not add any text before or after the JSON.`;

    return await generateResponse(prompt);
};

export { generateResponse, generateCourseStructure, generateLessonContent, generateQuiz };
