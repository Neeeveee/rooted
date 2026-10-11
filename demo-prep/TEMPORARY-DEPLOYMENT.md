# TEMPORARY recording deployment

Remove after the user says recording is finished. Normal homepage copy is commit 7ff2350587216367b41545036927cf528e2b4c1d; retain that permanent change.

Temporary changes: src/temporaryRecording.ts, tests/temporaryRecording.test.ts, main.tsx recordingStorage import and appStorage adapter, and this document. Revert only the temporary commit with a new commit; never force-reset main over later work.

GitHub Pages uses rooted-recording-temporary-v1 in localStorage. Normal rooted-app-v2 and legacy data are untouched. Local development remains ordinary. The prepared record is a synthetic demonstration resident, not a user-uploaded plan or private personal record. New adoptions persist in temporary storage across refreshes.

After rollback, normal visitors get the ordinary welcome/quiz and their own saved data. Temporary browser storage is ignored, not deleted. No destructive browser-data cleanup is necessary. New temporary records do not migrate into ordinary storage.

59 tests pass; ordinary and Pages builds pass. No API keys, images, presentations, experiment files, or deployment configuration changed.
