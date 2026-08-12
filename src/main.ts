import * as core from "@actions/core";
import { updateVersionsIn } from "./versions";

const version = core.getInput("version", { required: true });
const root = core.getInput("in") ?? ".";

await updateVersionsIn(root, version);
