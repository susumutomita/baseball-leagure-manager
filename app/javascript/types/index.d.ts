import { Application } from "@hotwired/stimulus";

declare global {
  interface Window {
    Stimulus: Application;
  }
}

interface RequireContext {
  keys(): string[];
  <T>(id: string): T;
}

interface NodeRequire {
  context(
    directory: string,
    useSubdirectories: boolean,
    regExp: RegExp
  ): RequireContext;
}

declare const require: NodeRequire;

export {};