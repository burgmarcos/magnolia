🎯 **What:** The `HardwareFitChip.tsx` component handles rendering statuses indicating if an AI model fits well on the current device. The tests missed coverage for custom labels provided to the `offload` and `cannot-run` fit states, as well as a fallback edge case when an unknown `fitState` string is provided to the component.

📊 **Coverage:** Tests were added for custom label overriding on `offload` and `cannot-run` states, asserting that the custom string appears instead of the default string. An additional test case validates the default configuration fallback logic using an invalid state value passed through `@ts-expect-error`.

✨ **Result:** Test assertions are more comprehensive, ensuring all switch case edge logic and fallback object patterns strictly behave as intended. Vitest returns 100% test passing metrics.
