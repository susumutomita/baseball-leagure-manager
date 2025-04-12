
import { Application } from "@hotwired/stimulus";

const application = Application.start();

application.debug = process.env.NODE_ENV === "development";
window.Stimulus = application;

const controllers = import.meta.glob("./**/*_controller.ts", { eager: true });
for (const path in controllers) {
  const controller = controllers[path];
  const controllerName = path
    .replace(/^\.\//, "")
    .replace(/\_controller\.ts$/, "")
    .replace(/\//g, "--");
  
  application.register(controllerName, controller.default);
}

export { application };
