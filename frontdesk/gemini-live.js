// Gemini Live API client. Ported from google-gemini/gemini-live-api-examples
// (frontend/geminilive.js), trimmed to what Katie needs.

export const ResponseType = {
  TEXT: "TEXT",
  AUDIO: "AUDIO",
  SETUP_COMPLETE: "SETUP_COMPLETE",
  INTERRUPTED: "INTERRUPTED",
  TURN_COMPLETE: "TURN_COMPLETE",
  TOOL_CALL: "TOOL_CALL",
  ERROR: "ERROR",
  INPUT_TRANSCRIPTION: "INPUT_TRANSCRIPTION",
  OUTPUT_TRANSCRIPTION: "OUTPUT_TRANSCRIPTION",
};

function parseResponseMessages(data) {
  const out = [];
  const sc = data?.serverContent;
  const parts = sc?.modelTurn?.parts;

  if (data?.setupComplete) {
    out.push({ type: ResponseType.SETUP_COMPLETE });
    return out;
  }
  if (data?.toolCall) {
    out.push({ type: ResponseType.TOOL_CALL, data: data.toolCall });
    return out;
  }
  if (parts?.length) {
    for (const part of parts) {
      if (part.inlineData) out.push({ type: ResponseType.AUDIO, data: part.inlineData.data });
      else if (part.text) out.push({ type: ResponseType.TEXT, data: part.text });
    }
  }
  if (sc?.inputTranscription) {
    out.push({
      type: ResponseType.INPUT_TRANSCRIPTION,
      data: { text: sc.inputTranscription.text ?? "", finished: !!sc.inputTranscription.finished },
    });
  }
  if (sc?.outputTranscription) {
    out.push({
      type: ResponseType.OUTPUT_TRANSCRIPTION,
      data: { text: sc.outputTranscription.text ?? "", finished: !!sc.outputTranscription.finished },
    });
  }
  if (sc?.interrupted) out.push({ type: ResponseType.INTERRUPTED });
  if (sc?.turnComplete) out.push({ type: ResponseType.TURN_COMPLETE });
  return out;
}

export class FunctionCallDefinition {
  constructor(name, description, parameters, required) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.required = required;
  }
  async functionToCall(_parameters) {
    return "ok";
  }
  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      parameters: { required: this.required, ...this.parameters },
    };
  }
  async run(parameters) {
    return await this.functionToCall(parameters);
  }
}

export class GeminiLiveAPI {
  constructor(token, model) {
    this.token = token;
    this.model = model;
    this.modelUri = `models/${this.model}`;
    this.responseModalities = ["AUDIO"];
    this.systemInstructions = "";
    this.voiceName = "Zephyr";
    this.temperature = 0.7;
    this.inputAudioTranscription = true;
    this.outputAudioTranscription = true;
    this.functions = [];
    this.functionsMap = {};
    this.connected = false;
    this.webSocket = null;
    this.lastSetupMessage = null;

    this.serviceUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${this.token}`;

    this.onReceiveResponse = () => {};
    this.onOpen = () => {};
    this.onClose = () => {};
    this.onError = () => {};
  }

  addFunction(fn) {
    this.functions.push(fn);
    this.functionsMap[fn.name] = fn;
  }

  async callFunction(name, parameters) {
    const fn = this.functionsMap[name];
    if (!fn) throw new Error(`unknown function ${name}`);
    return await fn.run(parameters);
  }

  connect() {
    this.webSocket = new WebSocket(this.serviceUrl);
    this.webSocket.onclose = () => {
      this.connected = false;
      this.onClose();
    };
    this.webSocket.onerror = () => {
      this.connected = false;
      this.onError("Connection error");
    };
    this.webSocket.onopen = () => {
      this.connected = true;
      this.sendInitialSetupMessages();
      this.onOpen();
    };
    this.webSocket.onmessage = async (ev) => {
      let txt;
      if (ev.data instanceof Blob) txt = await ev.data.text();
      else if (ev.data instanceof ArrayBuffer) txt = new TextDecoder().decode(ev.data);
      else txt = ev.data;
      try {
        const msg = JSON.parse(txt);
        for (const r of parseResponseMessages(msg)) this.onReceiveResponse(r);
      } catch (err) {
        console.error("parse error", err, txt);
      }
    };
  }

  disconnect() {
    if (this.webSocket) {
      this.webSocket.close();
      this.connected = false;
    }
  }

  sendMessage(obj) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(obj));
    }
  }

  sendInitialSetupMessages() {
    const tools = this.functions.map((f) => f.getDefinition());
    const setup = {
      setup: {
        model: this.modelUri,
        generationConfig: {
          responseModalities: this.responseModalities,
          temperature: this.temperature,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } },
          },
        },
        systemInstruction: { parts: [{ text: this.systemInstructions }] },
        tools: [{ functionDeclarations: tools }],
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            silenceDurationMs: 800,
            prefixPaddingMs: 300,
          },
          turnCoverage: "TURN_INCLUDES_ONLY_ACTIVITY",
        },
      },
    };
    if (this.inputAudioTranscription) setup.setup.inputAudioTranscription = {};
    if (this.outputAudioTranscription) setup.setup.outputAudioTranscription = {};
    this.lastSetupMessage = setup;
    this.sendMessage(setup);
  }

  sendTextMessage(text) {
    this.sendMessage({ realtimeInput: { text } });
  }

  sendToolResponse(functionResponses) {
    this.sendMessage({ toolResponse: { functionResponses } });
  }

  sendAudioMessage(base64PCM) {
    this.sendMessage({
      realtimeInput: { audio: { mimeType: "audio/pcm", data: base64PCM } },
    });
  }
}
