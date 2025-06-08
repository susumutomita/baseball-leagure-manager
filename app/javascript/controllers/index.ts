
import { Application } from "@hotwired/stimulus";

const application = Application.start();

application.debug = process.env.NODE_ENV === "development";
window.Stimulus = application;

const context = require.context("./", true, /_controller\.ts$/);
context.keys().forEach((key) => {
  const controllerName = key
    .replace(/^\.\//, "")
    .replace(/\_controller\.ts$/, "")
    .replace(/\//g, "--");
  const controller = context(key);
  application.register(controllerName, controller.default);
});

export { application };
