// Raises IPHONEOS_DEPLOYMENT_TARGET for every pod to at least 15.1 (Xcode 27 rejects targets < 15.0 in old pods like SDWebImage)
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
const SNIPPET = `
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |bc|
        v = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1' if v.nil? || Gem::Version.new(v) < Gem::Version.new('15.1')
      end
    end
`;
module.exports = (config) => withDangerousMod(config, ["ios", (c) => {
  const p = path.join(c.modRequest.platformProjectRoot, "Podfile");
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'")) {
    if (!s.includes("post_install do |installer|")) throw new Error("withPodTargets: post_install block not found in Podfile");
    s = s.replace("post_install do |installer|", "post_install do |installer|" + SNIPPET);
    fs.writeFileSync(p, s);
  }
  return c;
}]);
