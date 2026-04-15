// Katie's tools. Declared to Gemini. Each handler fetches the Cloudflare Worker.
// The browser holds the last slots returned so book_consult can pass full ISO + label
// even though Gemini only knows slot_id.

import { FunctionCallDefinition } from "./gemini-live.js";

const API_BASE = "/api/front-desk";

export class CheckAvailabilityTool extends FunctionCallDefinition {
  constructor(onToolEvent) {
    super(
      "check_availability",
      "Check available 15-minute consult slots with Anthony given a natural-language day window like 'Thursday or Friday morning', 'tomorrow afternoon', or 'next week'.",
      {
        type: "object",
        properties: {
          day_window: {
            type: "string",
            description:
              "Caller's preferred day window in natural language. e.g. 'Thursday or Friday morning', 'next week', 'tomorrow afternoon'.",
          },
        },
      },
      ["day_window"]
    );
    this.onToolEvent = onToolEvent;
    this.lastSlots = [];
  }

  async functionToCall({ day_window }) {
    this.onToolEvent?.({ name: this.name, status: "start", args: { day_window } });
    const res = await fetch(`${API_BASE}/check_availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_window }),
    });
    const data = await res.json();
    if (!res.ok) {
      this.onToolEvent?.({ name: this.name, status: "error", args: { day_window } });
      return { error: data.error || "availability_failed" };
    }
    this.lastSlots = data.slots || [];
    this.onToolEvent?.({
      name: this.name,
      status: "ok",
      args: { day_window },
      result: `${this.lastSlots.length} slot(s)`,
    });
    // Return a payload Katie can read aloud.
    return {
      resolved_window: data.resolved_window,
      slots: (data.slots || []).map((s) => ({ id: s.id, label: s.label })),
    };
  }
}

export class BookConsultTool extends FunctionCallDefinition {
  constructor(availabilityTool, onToolEvent) {
    super(
      "book_consult",
      "Book the 15-minute consult with Anthony. Call this only after the caller has confirmed a slot and all required fields.",
      {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          company: { type: "string" },
          role: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          slot_id: {
            type: "string",
            description: "The id returned from check_availability for the slot the caller chose.",
          },
        },
      },
      ["first_name", "last_name", "company", "email", "slot_id"]
    );
    this.availabilityTool = availabilityTool;
    this.onToolEvent = onToolEvent;
  }

  async functionToCall(args) {
    const slot = (this.availabilityTool.lastSlots || []).find((s) => s.id === args.slot_id);
    if (!slot) {
      this.onToolEvent?.({ name: this.name, status: "error", args });
      return { error: "unknown_slot_id. Call check_availability first." };
    }
    const payload = {
      first_name: args.first_name,
      last_name: args.last_name,
      company: args.company,
      role: args.role ?? "",
      email: args.email,
      phone: args.phone ?? "",
      slot_id: slot.id,
      slot_iso: slot.iso,
      slot_end_iso: slot.endIso,
      slot_label: slot.label,
    };
    this.onToolEvent?.({ name: this.name, status: "start", args: payload });
    const res = await fetch(`${API_BASE}/book_consult`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      this.onToolEvent?.({ name: this.name, status: "error", args: payload });
      return { error: data.error || "booking_failed" };
    }
    this.onToolEvent?.({
      name: this.name,
      status: "ok",
      args: payload,
      result: data.confirmation_id,
    });
    return {
      confirmation_id: data.confirmation_id,
      slot_label: data.slot_label,
    };
  }
}
