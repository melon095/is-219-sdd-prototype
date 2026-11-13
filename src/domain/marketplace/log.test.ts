import { describe, expect, it } from "vitest";
import {
  durationNoticeLog,
  editedLog,
  entryRemovedActivity,
  experienceLabel,
  interviewActivities,
  interviewInvitedLog,
  messageActivity,
  messageSentLog,
  newRequestActivity,
  offerAcceptedActivity,
  offerAcceptedLog,
  offerActivities,
  offerDeclinedLog,
  offerEndedActivity,
  offerExpiredLog,
  offeredLog,
  outcomeLabel,
  publishedLog,
  returnedToOpenActivity,
  returnedToOpenLog,
  shortlistActivity,
  shortlistEntryRemovedLog,
  shortlistedLog,
  shortlistRejectedActivity,
  shortlistRejectedLog,
  statusChangedLog,
  statusLabel,
  workLocationLabel,
} from "./log";
import { createContext, createState, ids, request } from "./testState";

const state = createState({ requests: [request("oppdrag-1")] });
const item = request("oppdrag-1");

describe("labels", () => {
  it("gives every status its Norwegian label", () => {
    expect(statusLabel("open")).toBe("Åpen");
    expect(statusLabel("shortlisted")).toBe("Kortliste klar");
    expect(statusLabel("offered")).toBe("Tilbud sendt");
    expect(statusLabel("agreed")).toBe("Avtalt");
    expect(statusLabel("in-progress")).toBe("Pågår");
    expect(statusLabel("completed")).toBe("Fullført");
    expect(statusLabel("cancelled")).toBe("Avlyst");
    expect(statusLabel("under-review")).toBe("Til vurdering");
  });

  it("labels experience levels, work locations and outcomes", () => {
    expect(experienceLabel("junior")).toBe("Junior");
    expect(experienceLabel("mid")).toBe("Erfaren");
    expect(experienceLabel("senior")).toBe("Senior");
    expect(workLocationLabel("remote")).toBe("Fjernarbeid");
    expect(workLocationLabel("onsite")).toBe("På stedet");
    expect(outcomeLabel("as-planned")).toBe("Som planlagt");
    expect(outcomeLabel("extended")).toBe("Ble forlenget");
    expect(outcomeLabel("permanent")).toBe("Ble fast ansettelse");
    expect(outcomeLabel("not-completed")).toBe("Ikke fullført");
  });
});

describe("log event builders", () => {
  it("fills in id, time and actor from the context", () => {
    const context = createContext(ids.owner1, "2026-11-16T10:00:00+01:00", "x");
    const event = publishedLog(state, context, ids.owner1);
    expect(event.id).toBe("x-1");
    expect(event.at).toBe("2026-11-16T10:00:00+01:00");
    expect(event.actor).toBe(ids.owner1);
    expect(event.kind).toBe("published");
    expect(event.text).toContain("Kari Nordmann");
  });

  it("builds each kind with the right kind and names", () => {
    const context = createContext(ids.owner1);
    const cases = [
      [editedLog(state, context, ids.owner1), "edited", "Kari Nordmann"],
      [durationNoticeLog(context, ids.owner1), "duration-notice", "Varighet"],
      [
        shortlistedLog(state, context, "system", ids.mats),
        "shortlisted",
        "Mats Johansen ble lagt til på kortlisten",
      ],
      [
        shortlistEntryRemovedLog(state, context, "system", ids.mats),
        "shortlist-entry-removed",
        "Mats Johansen",
      ],
      [
        interviewInvitedLog(state, context, ids.owner1, ids.mats),
        "interview-invited",
        "Kari Nordmann inviterte Mats Johansen",
      ],
      [
        offeredLog(state, context, ids.owner1, ids.mats),
        "offered",
        "Kari Nordmann ga Mats Johansen et tilbud",
      ],
      [
        offerAcceptedLog(state, context, ids.mats, ids.mats),
        "offer-accepted",
        "Mats Johansen",
      ],
      [
        offerDeclinedLog(state, context, ids.mats, ids.mats),
        "offer-declined",
        "Mats Johansen",
      ],
      [
        offerExpiredLog(state, context, "system", ids.mats),
        "offer-expired",
        "Mats Johansen",
      ],
      [
        shortlistRejectedLog(state, context, ids.owner1),
        "shortlist-rejected",
        "Kari Nordmann",
      ],
      [
        returnedToOpenLog(state, context, ids.admin),
        "returned-to-open",
        "Marte Vik",
      ],
    ] as const;
    for (const [event, kind, text] of cases) {
      expect(event.kind).toBe(kind);
      expect(event.text).toContain(text);
      expect(event.at).toBe(context.now);
    }
  });

  it("sets workerId on events that concern one worker", () => {
    const context = createContext(ids.owner1);
    expect(shortlistedLog(state, context, "system", ids.mats).workerId).toBe(
      ids.mats,
    );
    expect(offeredLog(state, context, ids.owner1, ids.mats).workerId).toBe(
      ids.mats,
    );
    expect(publishedLog(state, context, ids.owner1).workerId).toBeUndefined();
  });

  it("explains removal because the worker accepted another request", () => {
    const context = createContext(ids.owner1);
    const event = shortlistEntryRemovedLog(
      state,
      context,
      "system",
      ids.mats,
      "accepted-elsewhere",
    );
    expect(event.text).toContain("annet oppdrag");
  });

  it("names both people in a message event and never the message text", () => {
    const context = createContext(ids.owner1);
    const event = messageSentLog(
      state,
      context,
      ids.owner1,
      ids.mats,
      ids.mats,
    );
    expect(event.kind).toBe("message-sent");
    expect(event.actor).toBe(ids.owner1);
    expect(event.text).toContain("Kari Nordmann");
    expect(event.text).toContain("Mats Johansen");
    expect(event.workerId).toBe(ids.mats);
  });

  it("marks simulated expiry with the debug button text", () => {
    const context = createContext(ids.owner1);
    const event = offerExpiredLog(state, context, "system", ids.mats, true);
    expect(event.simulated).toBe(true);
    expect(event.text).toContain("Simulert med feilsøkingsknappen");
    const real = offerExpiredLog(state, context, "system", ids.mats);
    expect(real.simulated).toBeUndefined();
    expect(real.text).not.toContain("Simulert");
  });

  it("describes an automatic decline differently from a worker decline", () => {
    const context = createContext(ids.owner1);
    const byWorker = offerDeclinedLog(state, context, ids.mats, ids.mats);
    const automatic = offerDeclinedLog(state, context, "system", ids.mats);
    expect(byWorker.text).not.toBe(automatic.text);
  });

  it("builds status changes with Norwegian labels", () => {
    const context = createContext("system");
    const event = statusChangedLog(context, "system", "open", "shortlisted");
    expect(event.kind).toBe("status-changed");
    expect(event.fromStatus).toBe("open");
    expect(event.toStatus).toBe("shortlisted");
    expect(event.text).toContain("Åpen");
    expect(event.text).toContain("Kortliste klar");
  });
});

describe("activity builders", () => {
  const context = createContext(ids.owner1);

  it("links to the request page in the marketplace feature", () => {
    const entries = [
      newRequestActivity(state, context, ids.owner1, item),
      shortlistActivity(state, context, item, [ids.mats], 1, true),
      ...interviewActivities(state, context, ids.owner1, item, ids.mats),
      ...offerActivities(state, context, ids.owner1, item, ids.mats),
      offerAcceptedActivity(state, context, ids.mats, item, ids.mats),
      entryRemovedActivity(state, context, item, ids.mats),
      offerEndedActivity(state, context, ids.mats, item, ids.mats, "declined"),
      shortlistRejectedActivity(state, context, ids.owner1, item, [ids.mats]),
      returnedToOpenActivity(state, context, ids.admin, item),
      messageActivity(state, context, ids.owner1, item, ids.mats),
    ];
    for (const activity of entries) {
      expect(activity.featureId).toBe("marketplace");
      expect(activity.target.route).toBe("/oppdrag/oppdrag-1");
      expect(activity.at).toBe(context.now);
    }
  });

  it("sends a new request to the owner and the workers group", () => {
    const activity = newRequestActivity(state, context, ids.owner1, item);
    expect(activity.text).toContain("Nytt oppdrag");
    expect(activity.audience.personIds).toEqual([ids.owner1]);
    expect(activity.audience.groups).toEqual(["marketplace.workers"]);
  });

  it("sends a shortlist to the owner and each worker added", () => {
    const activity = shortlistActivity(
      state,
      context,
      item,
      [ids.mats, ids.amina],
      2,
      true,
    );
    expect(activity.text).toBe(
      "Fjordlys Keramikk har fått en kortliste med 2 kandidater",
    );
    expect(activity.actor).toBe("system");
    expect(activity.audience.personIds).toEqual([
      ids.owner1,
      ids.mats,
      ids.amina,
    ]);
    expect(activity.audience.groups).toEqual([]);
  });

  it("addresses the worker directly when inviting and offering", () => {
    const invite = interviewActivities(
      state,
      context,
      ids.owner1,
      item,
      ids.mats,
    );
    expect(invite).toHaveLength(2);
    expect(invite[0]?.text).toContain("Du er invitert til intervju");
    expect(invite[0]?.audience.personIds).toEqual([ids.mats]);
    expect(invite[1]?.audience.personIds).toEqual([ids.owner1]);
    const offer = offerActivities(state, context, ids.owner1, item, ids.mats);
    expect(offer).toHaveLength(2);
    expect(offer[0]?.text).toContain("Du har fått et tilbud");
    expect(offer[0]?.audience.personIds).toEqual([ids.mats]);
    expect(offer[1]?.audience.personIds).toEqual([ids.owner1]);
  });

  it("sends messages to the other participant only", () => {
    const activity = messageActivity(
      state,
      context,
      ids.owner1,
      item,
      ids.mats,
    );
    expect(activity.text).toContain("Ny melding");
    expect(activity.audience).toEqual({ personIds: [ids.mats], groups: [] });
  });

  it("sends a rejected shortlist to the owner and the removed workers", () => {
    const activity = shortlistRejectedActivity(
      state,
      context,
      ids.owner1,
      item,
      [ids.mats, ids.amina],
    );
    expect(activity.audience.personIds).toEqual([
      ids.owner1,
      ids.mats,
      ids.amina,
    ]);
  });

  it("tells owner and workers when a request is open again", () => {
    const activity = returnedToOpenActivity(state, context, ids.admin, item);
    expect(activity.text).toContain("Oppdraget er åpent igjen");
    expect(activity.audience.personIds).toEqual([ids.owner1]);
    expect(activity.audience.groups).toEqual(["marketplace.workers"]);
  });
});
