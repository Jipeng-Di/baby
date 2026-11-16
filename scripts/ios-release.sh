#!/bin/sh
# Builds the web bundle, archives the iOS app with the personal team (522GSXMJNG) and uploads it to
# App Store Connect / TestFlight. Needs the personal Apple ID signed in under Xcode → Settings → Accounts
# and the app record (bundle ID com.jipengdi.feedbook) created in App Store Connect.
# Xcode bumps the build number automatically on upload (manageAppVersionAndBuildNumber).
set -e
cd "$(dirname "$0")/.."
rm -rf .next/dev/types out-native
npm run build:native
OUT=build/ios
rm -rf "$OUT"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/Feedbook.xcarchive" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=522GSXMJNG archive
xcodebuild -exportArchive -archivePath "$OUT/Feedbook.xcarchive" \
  -exportOptionsPlist ios/ExportOptions.plist -exportPath "$OUT/export" -allowProvisioningUpdates
echo "Uploaded. The build shows up in App Store Connect → TestFlight after processing (about 10-30 min)."
