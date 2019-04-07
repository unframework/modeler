const Module = require("module");
const babelPresetReact = require("@babel/preset-react").default;
const babelify = require("babelify");
const browserify = require("browserify");
const fs = require("fs");
const path = require("path");
const { CSG } = require("@jscad/csg");
const { stlSerializer } = require("@jscad/io");

const requireString = (str, file) => {
  const paths = Module._nodeModulePaths(path.dirname(file));
  const m = new Module(file);
  m.paths = paths;
  m._compile(str, file);

  return m.exports;
};

module.exports = ({ modelFile, outFile }) =>
  browserify(modelFile, {
    node: true,
    basedir: process.cwd(),
    standalone: "MODELER_MODEL"
  })
    .transform(babelify, {
      global: true,
      presets: [babelPresetReact]
    })
    .external("react")
    .external("react-dom")
    .external("three")
    .bundle((err, code) => {
      if (err) {
        console.error(err.toString());
        process.exit(1);
      }

      const compiled = requireString(code.toString(), modelFile);

      if (compiled) {
        // <Model /> allows only one child
        const firstChild = compiled().props.children;

        // we only care about the model, not the parts
        const [model, _] = firstChild.type(firstChild.props);

        const MM = 10;

        const scaledModel = model.transform(
          CSG.Matrix4x4.scaling([MM, MM, MM])
        );

        const rawData = stlSerializer.serialize(scaledModel, { binary: false });

        fs.writeFileSync(outFile, rawData.join());
      }
    });
