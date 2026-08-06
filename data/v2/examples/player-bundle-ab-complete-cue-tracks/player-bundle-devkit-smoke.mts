import { execFile } from "node:child_process";
import { createHmac } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const exampleDir = path.dirname(fileURLToPath(import.meta.url));

type Options = {
  serialPath: string;
  monorepo: string;
  wasmVersion?: string;
  namespace: string;
  baudrate: number;
  scanTimeout: number;
  pollTimeout: number;
  evidence?: string;
  capacityProbe: boolean;
  confirmed: boolean;
  resumeAfterTngl: boolean;
  expectedTnglFingerprint?: string;
  resumeRevisionA?: number;
  resumeRevisionB?: number;
  observedNamespaceMax?: number;
};

type Artifact = {
  name: string;
  version: number;
  bytes: Uint8Array;
  fingerprint: string;
};

type ObservedEvent = {
  label: string;
  id: number;
  type: number;
  value: unknown;
  timestamp: number;
};

type ObservedCue = {
  global: ObservedEvent;
  local: ObservedEvent;
};

const parseOptions = (): Options => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (const argument of process.argv.slice(2)) {
    if (!argument.startsWith("--")) continue;
    const equals = argument.indexOf("=");
    if (equals < 0) flags.add(argument.slice(2));
    else values.set(argument.slice(2, equals), argument.slice(equals + 1));
  }

  const serialPath =
    values.get("path") ?? process.env.SPECTODA_SERIAL_PATH ?? "";
  const monorepo = path.resolve(
    values.get("monorepo") ?? process.env.SPECTODA_MONOREPO ?? "",
  );
  return {
    serialPath,
    monorepo,
    wasmVersion:
      values.get("wasm-version") ?? process.env.SPECTODA_WASM_VERSION,
    namespace: values.get("namespace") ?? "demo",
    baudrate: Number.parseInt(values.get("baudrate") ?? "1500000", 10),
    scanTimeout: Number.parseInt(values.get("scan-timeout") ?? "10000", 10),
    pollTimeout: Number.parseInt(values.get("poll-timeout") ?? "30000", 10),
    evidence: values.get("evidence"),
    capacityProbe: !flags.has("skip-capacity-probe"),
    confirmed: flags.has("confirm-isolated-devkit"),
    resumeAfterTngl: flags.has("resume-after-tngl"),
    expectedTnglFingerprint: values
      .get("expected-tngl-fingerprint")
      ?.toLowerCase(),
    resumeRevisionA: values.has("resume-revision-a")
      ? Number.parseInt(values.get("resume-revision-a")!, 10)
      : undefined,
    resumeRevisionB: values.has("resume-revision-b")
      ? Number.parseInt(values.get("resume-revision-b")!, 10)
      : undefined,
    observedNamespaceMax: values.has("observed-namespace-max")
      ? Number.parseInt(values.get("observed-namespace-max")!, 10)
      : undefined,
  };
};

const assertOptions = (options: Options): void => {
  if (!options.confirmed) {
    throw new Error(
      "Refusing writes without --confirm-isolated-devkit. Never run this against a customer Controller.",
    );
  }
  if (!options.serialPath) {
    throw new Error("Pass an explicit --path or SPECTODA_SERIAL_PATH");
  }
  if (
    !process.env.SPECTODA_MONOREPO &&
    !process.argv.some((v) => v.startsWith("--monorepo="))
  ) {
    throw new Error(
      "Pass --monorepo or SPECTODA_MONOREPO for the exact DEV-6449 checkout",
    );
  }
  if (!/^[A-Za-z0-9_-]{1,14}$/.test(options.namespace)) {
    throw new Error(
      "Namespace must use 1-14 ASCII letters, digits, underscore or hyphen",
    );
  }
  if (
    options.expectedTnglFingerprint !== undefined &&
    !/^[0-9a-f]{64}$/.test(options.expectedTnglFingerprint)
  ) {
    throw new Error("--expected-tngl-fingerprint must be 32 bytes of hex");
  }
  for (const [name, value] of [
    ["baudrate", options.baudrate],
    ["scan-timeout", options.scanTimeout],
    ["poll-timeout", options.pollTimeout],
  ] as const) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`Invalid ${name}: ${value}`);
    }
  }
  const resumeValues = [
    options.resumeRevisionA,
    options.resumeRevisionB,
    options.observedNamespaceMax,
  ];
  if (
    options.resumeAfterTngl &&
    resumeValues.some(
      (value) =>
        value === undefined || !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    throw new Error(
      "The fresh readback process requires valid resume revisions and observed namespace max",
    );
  }
};

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const fingerprint = (bytes: Uint8Array): string =>
  createHmac("sha256", "fingerprint").update(bytes).digest("hex");

const normalizeFingerprint = (value: unknown): string =>
  String(value).toLowerCase();

const assertTrackPayloadBytes = (size: number): void => {
  if (!Number.isSafeInteger(size) || size < 0 || size > 60_000) {
    throw new Error(`maxTrackPayloadBytes exceeded: ${size} > 60000`);
  }
};

const normalizeColor = (value: unknown): string =>
  String(value).replace(/^#/, "").toLowerCase();

// Studio removes comments and indentation before embedding a Project Berry
// source in TNGL. Mirror that safe subset so the physical smoke measures the
// deployable payload, not the copy-ready documentation comments.
const prepareBerryForTngl = (source: string): string =>
  source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .join("\n");

const main = async (): Promise<void> => {
  const options = parseOptions();
  assertOptions(options);
  if (options.wasmVersion) {
    if (options.wasmVersion.startsWith("DEBUG_DEV_")) {
      const localWasm = path.join(
        process.cwd(),
        ".webassembly",
        options.wasmVersion,
      );
      try {
        await Promise.all([
          access(`${localWasm}.js`),
          access(`${localWasm}.wasm`),
        ]);
      } catch {
        throw new Error(
          `Exact local ${options.wasmVersion}.{js,wasm} is required in ${path.dirname(localWasm)}; refusing the library's older universal-WASM fallback`,
        );
      }
    }
    (globalThis as Record<string, unknown>).__SPECTODA_WASM_VERSION_OVERRIDE__ =
      options.wasmVersion;
  }

  const jsModule = await import(
    pathToFileURL(path.join(options.monorepo, "packages/js/v012/index.ts")).href
  );
  const functionsModule = await import(
    pathToFileURL(path.join(options.monorepo, "packages/js/v012/functions.ts"))
      .href
  );
  const errorModule = await import(
    pathToFileURL(path.join(options.monorepo, "packages/error/index.ts")).href
  );
  const codec = await import(
    pathToFileURL(
      path.join(options.monorepo, "packages/js/v012/src/player-bundle.ts"),
    ).href
  );
  const api = (jsModule.default ?? jsModule) as Record<string, any>;
  const functions = (functionsModule.default ?? functionsModule) as Record<
    string,
    any
  >;
  const errors = (errorModule.default ?? errorModule) as Record<string, any>;
  const { CONNECTORS, Spectoda, SPECTODA_APP_EVENTS } = api;
  const { sleep } = functions;
  const { isError } = errors;

  const requireFromMonorepo = createRequire(
    path.join(options.monorepo, "package.json"),
  );
  const { SerialPort } = requireFromMonorepo("serialport") as {
    SerialPort: { list(): Promise<Array<{ path?: string }>> };
  };
  const availablePorts = (await SerialPort.list())
    .map((entry) => entry.path)
    .filter((entry): entry is string => typeof entry === "string");
  if (!availablePorts.includes(options.serialPath)) {
    throw new Error(
      `Explicit serial path is not present. Requested=${options.serialPath} available=${availablePorts.join(",")}`,
    );
  }

  const fixture = JSON.parse(
    await readFile(
      path.join(exampleDir, "player-bundle-artifacts.json"),
      "utf8",
    ),
  ) as {
    uploadOrder: Array<{
      name: string;
      hex: string;
    }>;
  };
  const source = await readFile(
    path.join(exampleDir, "player-bundle.be"),
    "utf8",
  );
  const baseByName = new Map(
    fixture.uploadOrder
      .filter((entry) => entry.name.endsWith(".spt"))
      .map((entry) => [
        entry.name,
        Uint8Array.from(Buffer.from(entry.hex, "hex")),
      ]),
  );
  const staticManifestEntry = fixture.uploadOrder.find(
    (entry) => entry.name === "demo.spm",
  );
  if (!staticManifestEntry) throw new Error("Fixture has no final SPM");
  const staticManifest = codec.decodePlayerManifest(
    Uint8Array.from(Buffer.from(staticManifestEntry.hex, "hex")),
    "demo",
  );
  if (!staticManifest.fallback)
    throw new Error("Fixture has no fallback generation");

  const spectoda = new Spectoda(CONNECTORS.NONE, false);
  const observed: ObservedEvent[] = [];
  const evidence: Record<string, unknown> = {
    schemaVersion: "spectoda.player-bundle-devkit-smoke.v1",
    startedAt: new Date().toISOString(),
    serialPath: options.serialPath,
    baudrate: options.baudrate,
    namespace: options.namespace,
    wasmVersion: options.wasmVersion ?? null,
    capacity: {},
    writes: [],
    generations: [],
  };

  const onEvents = (events: ObservedEvent[]): void => {
    observed.push(...events);
  };
  let unsubscribeStateUpdates = (): void => undefined;
  let unsubscribeEmittedEvents = (): void => undefined;
  let physicalTnglReadback: Record<string, unknown> | undefined;

  const listStorage = async (): Promise<
    Array<{ name: string; version: number; fingerprint: string }>
  > => {
    const result = await spectoda.listNetworkStorageData();
    if (isError(result) || !Array.isArray(result)) {
      throw new Error(
        `NetworkStorage listing failed: ${JSON.stringify(result)}`,
      );
    }
    return result;
  };

  const verifyExactReadback = async (artifact: Artifact): Promise<void> => {
    const deadline = Date.now() + options.pollTimeout;
    let last: unknown;
    while (Date.now() < deadline) {
      const readback = await spectoda.getNetworkStorageData(artifact.name);
      const listing = await listStorage();
      const metadata = listing.find((entry) => entry.name === artifact.name);
      last = { readback, metadata };
      if (
        !isError(readback) &&
        readback.version === artifact.version &&
        bytesEqual(readback.bytes, artifact.bytes) &&
        metadata?.version === artifact.version &&
        metadata.fingerprint.toLowerCase() === artifact.fingerprint
      ) {
        console.log(
          `[player-bundle-smoke] exact readback ${artifact.name} version=${artifact.version} size=${artifact.bytes.length} fingerprint=${artifact.fingerprint}`,
        );
        return;
      }
      await sleep(250);
    }
    throw new Error(
      `Exact readback timed out for ${artifact.name}: ${JSON.stringify(last)}`,
    );
  };

  const writeAndVerify = async (artifact: Artifact): Promise<void> => {
    const result = await spectoda.emitNetworkStorageData({
      name: artifact.name,
      version: artifact.version,
      bytes: artifact.bytes,
    });
    if (isError(result)) {
      throw new Error(
        `NetworkStorage write failed for ${artifact.name}: ${result.id}`,
      );
    }
    await verifyExactReadback(artifact);
    (evidence.writes as unknown[]).push({
      name: artifact.name,
      version: artifact.version,
      size: artifact.bytes.length,
      fingerprint: artifact.fingerprint,
    });
  };

  const waitEvent = async (
    start: number,
    label: string,
    id: number,
    expected: unknown,
    afterTimestamp = -1,
    timeout = options.pollTimeout,
  ): Promise<ObservedEvent> => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const match = observed.slice(start).find((event) => {
        if (
          event.label !== label ||
          event.id !== id ||
          event.timestamp <= afterTimestamp
        )
          return false;
        return label === "color"
          ? normalizeColor(event.value) === normalizeColor(expected)
          : event.value === expected;
      });
      if (match) return match;
      await sleep(250);
    }
    throw new Error(
      `Timed out waiting for $${label}[ID${id}]=${String(expected)}; new events=${JSON.stringify(observed.slice(start))}`,
    );
  };

  const waitCue = async (
    start: number,
    brightness: number,
    color: string,
    afterTimestamp = -1,
    timeout = options.pollTimeout,
  ): Promise<ObservedCue> => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const window = observed
        .slice(start)
        .filter((event) => event.timestamp > afterTimestamp);
      for (const global of window) {
        if (
          global.label !== "color" ||
          global.id !== 255 ||
          normalizeColor(global.value) !== normalizeColor(color)
        ) {
          continue;
        }
        const local = window.find(
          (event) =>
            event.label === "brigh" &&
            event.id === 1 &&
            event.value === brightness &&
            event.timestamp === global.timestamp,
        );
        if (local) return { global, local };
      }
      await sleep(250);
    }
    throw new Error(
      `Timed out waiting for one causal Cue color[ID255]=${color} + brigh[ID1]=${brightness}; new events=${JSON.stringify(observed.slice(start))}`,
    );
  };

  const cueEvidence = (
    timelineMillis: number,
    brightness: number,
    color: string,
    cue: ObservedCue,
  ): Record<string, unknown> => ({
    timelineMillis,
    expected: {
      global: { label: "color", id: 255, value: normalizeColor(color) },
      local: { label: "brigh", id: 1, value: brightness },
      causalClockEqual: true,
    },
    observed: {
      global: {
        label: cue.global.label,
        id: cue.global.id,
        value: normalizeColor(cue.global.value),
        clock: cue.global.timestamp,
      },
      local: {
        label: cue.local.label,
        id: cue.local.id,
        value: cue.local.value,
        clock: cue.local.timestamp,
      },
      causalClockEqual: cue.global.timestamp === cue.local.timestamp,
    },
  });

  const assertNoValues = async (
    start: number,
    duration: number,
    forbiddenBrightness: number,
    forbiddenColor: string,
  ): Promise<Record<string, unknown>> => {
    await sleep(duration);
    const window = observed.slice(start);
    const forbiddenEvents = window.filter(
      (event) =>
        (event.label === "brigh" &&
          event.id === 1 &&
          event.value === forbiddenBrightness) ||
        (event.label === "color" &&
          event.id === 255 &&
          normalizeColor(event.value) === normalizeColor(forbiddenColor)),
    );
    if (forbiddenEvents.length > 0) {
      throw new Error(
        `Paused timeline landed a future value: ${JSON.stringify(forbiddenEvents[0])}`,
      );
    }
    return {
      durationMs: duration,
      expectedAbsent: {
        global: {
          label: "color",
          id: 255,
          value: normalizeColor(forbiddenColor),
        },
        local: { label: "brigh", id: 1, value: forbiddenBrightness },
      },
      observedForbiddenEvents: forbiddenEvents,
      pass: true,
    };
  };

  const exerciseTransport = async (
    generationName: string,
    values: { at0: number; at1000: number; at2000: number },
    publishedCue?: ObservedCue,
  ): Promise<Record<string, unknown>> => {
    const generationEvidence: Record<string, unknown> = {
      generation: generationName,
      steps: {},
    };
    const steps = generationEvidence.steps as Record<string, unknown>;

    let start = observed.length;
    let initial = publishedCue;
    if (!initial) {
      await spectoda.rewindTimeline(true);
      initial = await waitCue(start, values.at0, "#ff5500");
    }
    steps.initial = cueEvidence(0, values.at0, "#ff5500", initial);
    const pausedStart = observed.length;
    steps.initialPausedGate = await assertNoValues(
      pausedStart,
      300,
      values.at1000,
      "#0055ff",
    );

    const externalStart = observed.length;
    await spectoda.emitPercentage("brigh", 33, 1);
    const externalLocal = await waitEvent(
      externalStart,
      "brigh",
      1,
      33,
      initial.local.timestamp,
    );
    const externalPausedStart = observed.length;
    const externalPausedGate = await assertNoValues(
      externalPausedStart,
      300,
      values.at1000,
      "#0055ff",
    );
    steps.externalAuthorityWhilePaused = {
      expected: {
        timelinePaused: true,
        global: { label: "color", id: 255, value: "#ff5500" },
        local: { label: "brigh", id: 1, value: 33 },
        playerDoesNotReassertUntilNextDueCue: true,
      },
      observed: {
        global: {
          label: initial.global.label,
          id: initial.global.id,
          value: normalizeColor(initial.global.value),
          clock: initial.global.timestamp,
        },
        local: {
          label: externalLocal.label,
          id: externalLocal.id,
          value: externalLocal.value,
          clock: externalLocal.timestamp,
        },
        localClockAdvanced: externalLocal.timestamp > initial.local.timestamp,
        pausedGate: externalPausedGate,
      },
    };

    start = observed.length;
    await spectoda.unpauseTimeline();
    const forward1000 = await waitCue(
      start,
      values.at1000,
      "#0055ff",
      initial.global.timestamp,
    );
    steps.forward1000 = cueEvidence(
      1000,
      values.at1000,
      "#0055ff",
      forward1000,
    );

    await spectoda.pauseTimeline();
    start = observed.length;
    let seek: ObservedCue | undefined;
    for (let attempt = 0; attempt < 3 && !seek; attempt += 1) {
      await spectoda.setTimelineMillis(1000);
      try {
        seek = await waitCue(
          start,
          values.at1000,
          "#0055ff",
          forward1000.global.timestamp,
          2_000,
        );
      } catch (error) {
        if (attempt === 2) throw error;
        await sleep(100);
      }
    }
    if (!seek) throw new Error("Timeline seek produced no complete Cue");
    steps.seek1000 = cueEvidence(1000, values.at1000, "#0055ff", seek);
    const seekPausedStart = observed.length;
    steps.seekPausedGate = await assertNoValues(
      seekPausedStart,
      500,
      values.at2000,
      "#ff5500",
    );

    start = observed.length;
    await spectoda.unpauseTimeline();
    const forward2000 = await waitCue(
      start,
      values.at2000,
      "#ff5500",
      seek.global.timestamp,
    );
    steps.forward2000 = cueEvidence(
      2000,
      values.at2000,
      "#ff5500",
      forward2000,
    );

    // A running rewind represents the loop discontinuity. The Player must
    // reconstruct t=0, then continue to the next timed Cue.
    start = observed.length;
    await spectoda.rewindTimeline(false);
    const loop0 = await waitCue(
      start,
      values.at0,
      "#ff5500",
      forward2000.global.timestamp,
    );
    const loop1000 = await waitCue(
      start,
      values.at1000,
      "#0055ff",
      loop0.global.timestamp,
    );
    steps.loop0 = cueEvidence(0, values.at0, "#ff5500", loop0);
    steps.loop1000 = cueEvidence(1000, values.at1000, "#0055ff", loop1000);

    start = observed.length;
    await spectoda.rewindTimeline(true);
    const finalPaused = await waitCue(
      start,
      values.at0,
      "#ff5500",
      loop1000.global.timestamp,
    );
    steps.finalPaused0 = cueEvidence(
      0,
      values.at0,
      "#ff5500",
      finalPaused,
    );
    return generationEvidence;
  };

  try {
    // SpectodaWasm persists its preview filesystem below the process cwd.
    await mkdir(path.resolve(process.cwd(), "filesystem"), {
      recursive: true,
    });
    await spectoda.connect(
      "serial",
      { path: options.serialPath, baudrate: options.baudrate },
      { autoSelect: true, scanTimeout: options.scanTimeout },
    );
    unsubscribeStateUpdates = spectoda.on(
      SPECTODA_APP_EVENTS.EVENT_STATE_UPDATES,
      onEvents,
    );
    unsubscribeEmittedEvents = spectoda.on(
      SPECTODA_APP_EVENTS.EMITTED_EVENTS,
      onEvents,
    );
    const controllerInfo = await spectoda.readControllerInfo();
    evidence.controller = {
      productCode: controllerInfo.productCode,
      fwVersion: controllerInfo.fwVersion,
      fwVersionFull: controllerInfo.fwVersionFull,
      fwVersionCode: controllerInfo.fwVersionCode,
    };
    if (options.resumeAfterTngl) {
      const expected = options.expectedTnglFingerprint;
      if (!expected) {
        throw new Error(
          "The fresh readback process requires --expected-tngl-fingerprint",
        );
      }

      // syncTngl() performs a physical READ_TNGL_BYTECODE request, then loads
      // the returned bytes into this fresh WASM runtime. Comparing its hash to
      // the pre-restart compiler hash proves exact bytecode readback even on
      // banked firmware whose readControllerInfo() fingerprint is all zeroes.
      await spectoda.syncTngl();
      const observedFingerprint = normalizeFingerprint(
        spectoda.runtime.spectoda_js.getTnglFingerprint(),
      );
      if (observedFingerprint !== expected) {
        throw new Error(
          `Physical TNGL readback differs: expected=${expected} observed=${observedFingerprint}`,
        );
      }
      physicalTnglReadback = {
        method: "syncTngl physical bytecode readback into a fresh WASM runtime",
        expectedBytecodeFingerprint: expected,
        observedBytecodeFingerprint: observedFingerprint,
        controllerInfoFingerprint: controllerInfo.tnglFingerprint,
        exactMatch: true,
        resumedAfterSerialRestart: true,
      };
    }
    const { stdout: monorepoHead } = await execFileAsync(
      "git",
      ["-C", options.monorepo, "rev-parse", "HEAD"],
      { encoding: "utf8" },
    );
    evidence.monorepoHead = monorepoHead.trim();
    console.log(
      `[player-bundle-smoke] connected path=${options.serialPath} firmware=${controllerInfo.fwVersionFull} monorepo=${monorepoHead.trim()}`,
    );

    const listingBefore = await listStorage();
    const namespacePrefix = `${options.namespace}.`;
    const observedMax = options.resumeAfterTngl
      ? options.observedNamespaceMax!
      : listingBefore
          .filter(
            (entry) =>
              entry.name === `${options.namespace}.spm` ||
              entry.name.startsWith(namespacePrefix),
          )
          .reduce((maximum, entry) => Math.max(maximum, entry.version), 0);
    const revisionA = options.resumeAfterTngl
      ? options.resumeRevisionA!
      : Math.max(Date.now(), observedMax + 1);
    const revisionB = options.resumeAfterTngl
      ? options.resumeRevisionB!
      : revisionA + 1;
    codec.assertPlayerRevision(revisionA);
    codec.assertPlayerRevision(revisionB);
    evidence.revisions = { observedMax, revisionA, revisionB };

    const makeGeneration = async (
      slot: "a" | "b",
      revision: number,
      source: any,
    ): Promise<{ generation: any; tracks: Artifact[] }> => {
      const tracks: Artifact[] = [];
      const descriptors: any[] = [];
      for (const descriptor of source.tracks) {
        const baseName = `demo.${slot}.${String(descriptor.id).padStart(3, "0")}.spt`;
        const base = baseByName.get(baseName);
        if (!base) throw new Error(`Fixture is missing ${baseName}`);
        const bytes = codec.stampPlayerTrackRevision(base, revision);
        assertTrackPayloadBytes(bytes.length);
        const artifact: Artifact = {
          name: codec.playerTrackFilename(
            options.namespace,
            slot,
            descriptor.id,
          ),
          version: revision,
          bytes,
          fingerprint: fingerprint(bytes),
        };
        tracks.push(artifact);
        descriptors.push({
          id: descriptor.id,
          artifactRevision: revision,
          size: bytes.length,
          fingerprint: artifact.fingerprint,
        });
      }
      return {
        tracks,
        generation: {
          slot,
          showRevision: revision,
          durationMillis: source.durationMillis,
          contentFingerprint: source.contentFingerprint,
          tracks: descriptors,
        },
      };
    };

    const stageA = await makeGeneration(
      "a",
      revisionA,
      staticManifest.fallback,
    );
    const stageB = await makeGeneration(
      "b",
      revisionB,
      staticManifest.preferred,
    );
    const manifestABytes = codec.encodePlayerManifest({
      namespace: options.namespace,
      preferred: stageA.generation,
      fallback: null,
    });
    const manifestBBytes = codec.encodePlayerManifest({
      namespace: options.namespace,
      preferred: stageB.generation,
      fallback: stageA.generation,
    });
    const manifestA: Artifact = {
      name: codec.playerManifestFilename(options.namespace),
      version: revisionA,
      bytes: manifestABytes,
      fingerprint: fingerprint(manifestABytes),
    };
    const manifestB: Artifact = {
      name: codec.playerManifestFilename(options.namespace),
      version: revisionB,
      bytes: manifestBBytes,
      fingerprint: fingerprint(manifestBBytes),
    };

    assertTrackPayloadBytes(60_000);
    let overLimitWriteAttempted = false;
    try {
      assertTrackPayloadBytes(60_001);
      overLimitWriteAttempted = true;
    } catch {
      // Expected pre-write rejection.
    }
    if (overLimitWriteAttempted) {
      throw new Error("60,001-byte payload reached the write boundary");
    }
    (evidence.capacity as Record<string, unknown>).preWriteGate = {
      accepted: 60_000,
      rejectedBeforeWrite: 60_001,
    };
    let capacityProbe: Artifact | undefined;
    if (options.capacityProbe) {
      const probeBytes = Uint8Array.from(
        { length: 60_000 },
        (_, index) => index & 0xff,
      );
      capacityProbe = {
        name: `${options.namespace}.cap.bin`,
        version: revisionA,
        bytes: probeBytes,
        fingerprint: fingerprint(probeBytes),
      };
      if (options.resumeAfterTngl) {
        await verifyExactReadback(capacityProbe);
      } else {
        await writeAndVerify(capacityProbe);
      }
      (evidence.capacity as Record<string, unknown>).exactReadback = {
        name: capacityProbe.name,
        size: capacityProbe.bytes.length,
        version: capacityProbe.version,
        fingerprint: capacityProbe.fingerprint,
        writtenBeforeTnglRestart: true,
        verifiedAfterRestart: options.resumeAfterTngl,
      };
    }

    // A/B contract: all inactive-slot SPT writes and exact readbacks precede
    // the manifest write. SPM is always the final publication operation.
    if (options.resumeAfterTngl) {
      for (const artifact of stageA.tracks) await verifyExactReadback(artifact);
      await verifyExactReadback(manifestA);
      evidence.preRestartPublication = {
        revision: revisionA,
        artifacts: [...stageA.tracks, manifestA].map((artifact) => ({
          name: artifact.name,
          version: artifact.version,
          size: artifact.bytes.length,
          fingerprint: artifact.fingerprint,
        })),
        spmLast: true,
        exactReadbackAfterRestart: true,
      };
    } else {
      for (const artifact of stageA.tracks) await writeAndVerify(artifact);
      await writeAndVerify(manifestA);
    }

    const uploadSource = prepareBerryForTngl(source);
    const configuredSource = uploadSource.replace(
      'PlayerBundle({"namespace": "demo", "ids": [1], "debug": false})',
      `PlayerBundle({"namespace":"${options.namespace}","ids":[1],"debug":true})`,
    );
    if (configuredSource === uploadSource) {
      throw new Error(
        "Could not replace the example PlayerBundle configuration",
      );
    }
    const tngl = `BERRY(\`${configuredSource.replaceAll("`", "\\`")}\`);`;
    if (!options.resumeAfterTngl) {
      await spectoda.writeTngl(tngl, null, 0);
      const expectedTnglFingerprint = normalizeFingerprint(
        spectoda.runtime.spectoda_js.getTnglFingerprint(),
      );
      if (!/^[0-9a-f]{64}$/.test(expectedTnglFingerprint)) {
        throw new Error(
          `Compiler returned an invalid TNGL fingerprint: ${expectedTnglFingerprint}`,
        );
      }
      // Big TNGL writes restart the ESP after the JS execute promise resolves.
      // Let flash finalization and bank activation settle before any readback
      // process reconnects; early connects can legitimately report no bank.
      await sleep(15_000);
      await spectoda.disconnect().catch(() => undefined);
      await spectoda.runtime.destroyConnector().catch(() => undefined);

      // A large Project TNGL restarts the physical Controller and intentionally
      // drops NodeSerial. Continue in a fresh process/WASM runtime so all
      // playback assertions are made after a real serial reconnect.
      const childArguments = process.argv
        .slice(2)
        .filter(
          (argument) =>
            argument !== "--resume-after-tngl" &&
            !argument.startsWith("--expected-tngl-fingerprint="),
        );
      childArguments.push("--resume-after-tngl");
      childArguments.push(
        `--expected-tngl-fingerprint=${expectedTnglFingerprint}`,
      );
      childArguments.push(`--resume-revision-a=${revisionA}`);
      childArguments.push(`--resume-revision-b=${revisionB}`);
      childArguments.push(`--observed-namespace-max=${observedMax}`);
      let child: { stdout: string; stderr: string } | undefined;
      let lastChildError: unknown;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          child = await execFileAsync(
            path.join(options.monorepo, "node_modules/.bin/tsx"),
            [fileURLToPath(import.meta.url), ...childArguments],
            {
              cwd: process.cwd(),
              encoding: "utf8",
              env: process.env,
              maxBuffer: 10 * 1024 * 1024,
            },
          );
          break;
        } catch (error) {
          lastChildError = error;
          if (attempt === 3) throw error;
          console.warn(
            `[player-bundle-smoke] fresh TNGL readback process attempt ${attempt} failed; retrying after restart settles`,
          );
          await sleep(5_000);
        }
      }
      if (!child) throw lastChildError;
      process.stdout.write(child.stdout);
      process.stderr.write(child.stderr);
      return;
    }

    (evidence.controller as Record<string, unknown>).postTnglReadback = {
      ...physicalTnglReadback,
      fwVersionFull: controllerInfo.fwVersionFull,
      berrySourceBytes: Buffer.byteLength(configuredSource, "utf8"),
    };
    (evidence.generations as unknown[]).push(
      await exerciseTransport("slot-a", { at0: 10, at1000: 60, at2000: 10 }),
    );

    const inactiveWriteStart = observed.length;
    for (const artifact of stageB.tracks) await writeAndVerify(artifact);
    const premature = observed
      .slice(inactiveWriteStart)
      .find(
        (event) =>
          event.label === "brigh" && event.id === 1 && event.value === 20,
      );
    if (premature) {
      throw new Error(
        `Inactive-slot SPT changed playback before SPM: ${JSON.stringify(premature)}`,
      );
    }
    const publicationStart = observed.length;
    await writeAndVerify(manifestB);
    const switched = await waitCue(publicationStart, 20, "#ff5500");
    console.log(
      `[player-bundle-smoke] A/B switch PASS slot=b causalClock=${switched.global.timestamp}`,
    );
    (evidence.generations as unknown[]).push(
      await exerciseTransport(
        "slot-b",
        { at0: 20, at1000: 100, at2000: 20 },
        switched,
      ),
    );

    if (options.capacityProbe) {
      const retiredProbe: Artifact = {
        name: `${options.namespace}.cap.bin`,
        version: revisionB + 1,
        bytes: new Uint8Array(),
        fingerprint: fingerprint(new Uint8Array()),
      };
      codec.assertPlayerRevision(retiredProbe.version, "capacity cleanup");
      await writeAndVerify(retiredProbe);
      (evidence.capacity as Record<string, unknown>).cleanup = {
        name: retiredProbe.name,
        version: retiredProbe.version,
        size: 0,
        fingerprint: retiredProbe.fingerprint,
      };
    }

    const finalMetadata = (await listStorage()).filter(
      (entry) =>
        entry.name === `${options.namespace}.spm` ||
        entry.name.startsWith(namespacePrefix),
    );
    const finalListing = [];
    for (const entry of finalMetadata) {
      const readback = await spectoda.getNetworkStorageData(entry.name);
      finalListing.push({
        ...entry,
        size: isError(readback) ? null : readback.bytes.length,
      });
    }
    evidence.finalListing = finalListing;
    evidence.completedAt = new Date().toISOString();
    evidence.result = "PASS";
    console.log(
      `[player-bundle-smoke] PASS ${JSON.stringify(evidence, null, 2)}`,
    );
    if (options.evidence) {
      await writeFile(
        path.resolve(options.evidence),
        `${JSON.stringify(evidence, null, 2)}\n`,
      );
    }
  } finally {
    unsubscribeStateUpdates();
    unsubscribeEmittedEvents();
    await spectoda.disconnect().catch(() => undefined);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[player-bundle-smoke] FAIL", error);
    process.exit(1);
  });
