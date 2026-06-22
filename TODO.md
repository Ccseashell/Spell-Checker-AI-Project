# TODO

- [ ] Add backend request caps (max tokens analyzed + max errors ranked) to prevent slowdown on long texts.
- [x] Optimize candidate ranking in `ErrorDetectionModule._rank_candidates` and suggestion ranking in `UserCorrectionModule`:
  - [x] Avoid repeated expensive computations via per-request caching (phonetic codes, levenshtein prerequisites).
  - [x] Add cheap pre-filters before running `SequenceMatcher`.
  - [x] Reduce number of candidates that reach expensive similarity scoring.
- [x] Add a couple of light guards (length-based candidate limits) to prevent pathological cases.
- [ ] Verify server still runs and returns JSON for empty/short inputs.


