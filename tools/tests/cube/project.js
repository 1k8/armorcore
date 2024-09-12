
let flags = globalThis.flags;
flags.with_iron = true;
flags.with_g2 = true;
flags.with_ui = true;

let project = new Project("Test");
project.add_project("../../../");
project.add_tsfiles("sources");
project.add_shaders("shaders/*.glsl");
project.add_shaders("../../../shaders/*.glsl");
project.add_assets("assets/*", { destination: "data/{name}" });

return project;
