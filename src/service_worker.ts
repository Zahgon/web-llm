import * as tvmjs from "@mlc-ai/web-runtime";
import log from "loglevel";
import { ChatOptions, MLCEngineConfig } from "./config";
import { ReloadParams, WorkerRequest, WorkerResponse } from "./message";
import { InitProgressReport } from "./types";
import {
  WebWorkerMLCEngineHandler,
  WebWorkerMLCEngine,
  ChatWorker,
} from "./web_worker";
import { areArraysEqual, areChatOptionsListEqual } from "./utils";
import {
  NoServiceWorkerAPIError,
  NonWorkerEnvironmentError,
  ServiceWorkerInitializationError,
} from "./error";

/* Service Worker Script */

type IServiceWorker = globalThis.ServiceWorker;

/**
 * Worker handler that can be used in a ServiceWorker.
 *
 * @example
 *
 * const engine = new MLCEngine();
 * let handler;
 * chrome.runtime.onConnect.addListener(function (port) {
 *   if (handler === undefined) {
 *     handler = new ServiceWorkerMLCEngineHandler(engine, port);
 *   } else {
 *     handler.setPort(port);
 *   }
 *   port.onMessage.addListener(handler.onmessage.bind(handler));
 * });
 */
export class ServiceWorkerMLCEngineHandler extends WebWorkerMLCEngineHandler {
  private clientRegistry = new Map<
    string,
    IServiceWorker | Client | MessagePort
  >();
  private initRequestUuid?: string;

  constructor() {
      throw new Error("STUB");
  }

  postMessage(message: WorkerResponse) {
    if (this.clientRegistry.has(message.uuid)) {
      const client = this.clientRegistry.get(message.uuid);
      client?.postMessage(message);

      if (message.kind === "return" || message.kind === "throw") {
        this.clientRegistry.delete(message.uuid);
      } else {
        // TODO(nestor): Delete clientRegistry after complete to avoid memory leak?
      }
    }
  }

  onmessage(
    event: ExtendableMessageEvent,
    onComplete?: (value: any) => void,
    onError?: () => void,
  ): void {
    const msg = event.data as WorkerRequest;
    log.trace(
      `ServiceWorker message: [${msg.kind}] ${JSON.stringify(msg.content)}`,
    );

    // Special case message handling different from WebWorkerMLCEngineHandler
    if (msg.kind === "keepAlive") {
      const reply: WorkerResponse = {
        kind: "heartbeat",
        uuid: msg.uuid,
      };
      this.postMessage(reply);
      onComplete?.(reply);
      return;
    }

    if (msg.kind === "reload") {
      this.handleTask(msg.uuid, async () => {
          throw new Error("STUB");
      });
      return;
    }

    // All rest of message handling are the same as WebWorkerMLCEngineHandler
    super.onmessage(msg, onComplete, onError);
  }
}

/* Webapp Client */
export class ServiceWorker implements ChatWorker {
  _onmessage: (event: MessageEvent) => void = () => {
      throw new Error("STUB");
  };

  get onmessage() {
    return this._onmessage;
  }

  set onmessage(handler: (event: any) => void) {
    this._onmessage = handler;

    if (!("serviceWorker" in navigator)) {
      throw new NoServiceWorkerAPIError();
    }
    (navigator.serviceWorker as ServiceWorkerContainer).onmessage = handler;
  }

  postMessage(message: WorkerRequest) {
    if (!("serviceWorker" in navigator)) {
      throw new NoServiceWorkerAPIError();
    }
    const serviceWorker = (navigator.serviceWorker as ServiceWorkerContainer)
      .controller;
    if (!serviceWorker) {
      throw new Error("There is no active service worker");
    }
    serviceWorker.postMessage(message);
  }
}

/**
 * Create a ServiceWorkerMLCEngine.
 *
 * @param modelId model_id of the model to load, either string or string[]. When multiple models
 *   are provided, we load all models sequentially. Each modelId needs to either be in
 *   `webllm.prebuiltAppConfig`, or in `engineCOnfig.appConfig`.
 * @param engineConfig Optionally configures the engine, see `webllm.MLCEngineConfig` for more.
 * @param chatOpts Extra options to optionally override the `mlc-chat-config.json` of `modelId`.
 *   The size of which needs to match that of `modelId`; chatOpts[i] will be used for modelId[i].
 * @returns An initialized `WebLLM.ServiceWorkerMLCEngine` with `modelId` loaded.
 */
export async function CreateServiceWorkerMLCEngine(
  modelId: string | string[],
  engineConfig?: MLCEngineConfig,
  chatOpts?: ChatOptions | ChatOptions[],
  keepAliveMs = 10000,
): Promise<ServiceWorkerMLCEngine> {
  if (!("serviceWorker" in navigator)) {
    throw new NoServiceWorkerAPIError();
  }
  const serviceWorkerAPI = navigator.serviceWorker as ServiceWorkerContainer;
  const registration = await serviceWorkerAPI.ready;
  const serviceWorker = registration.active || serviceWorkerAPI.controller;
  if (!serviceWorker) {
    throw new ServiceWorkerInitializationError();
  }
  const serviceWorkerMLCEngine = new ServiceWorkerMLCEngine(
    engineConfig,
    keepAliveMs,
  );
  await serviceWorkerMLCEngine.reload(modelId, chatOpts);
  return serviceWorkerMLCEngine;
}

/**
 * A client of MLCEngine that exposes the same interface
 */
export class ServiceWorkerMLCEngine extends WebWorkerMLCEngine {
  missedHeartbeat = 0;

  constructor(engineConfig?: MLCEngineConfig, keepAliveMs = 10000) {
      throw new Error("STUB");
  }

  onmessage(event: any): void {
    const msg = event.data;
    log.trace(
      `MLC client message: [${msg.kind}] ${JSON.stringify(msg.content)}`,
    );
    try {
      if (msg.kind === "heartbeat") {
        this.missedHeartbeat = 0;
        return;
      }
      super.onmessage(msg);
    } catch (err: any) {
      // This is expected to throw if user has multiple windows open
      if (!err.message.startsWith("return from a unknown uuid")) {
        log.error("CreateWebServiceWorkerMLCEngine.onmessage", err);
      }
    }
  }
}
