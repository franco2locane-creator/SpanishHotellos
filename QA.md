# QA Manual Checklist — Spanish4Hoteleros

Run on: iOS Simulator + physical Android device before every production build.

---

## 1. Auth flow

- [ ] **Sign up** — create a new account with email + password; placement test launches automatically
- [ ] **Email confirmation** — link in email redirects back to app and advances to onboarding
- [ ] **Sign in** — existing account signs in; lands on Today tab
- [ ] **Sign out** (Settings → Sign out) — lands on auth screen; cannot navigate back into the app
- [ ] **Apple / Google sign-in** — buttons appear on iOS/Android; hidden on web
- [ ] **Invalid credentials** — wrong password shows human-readable error; no crash

---

## 2. Onboarding / placement test

- [ ] Placement test presents 10 vocabulary questions
- [ ] Completing the test routes to Today tab (does NOT loop back to the test)
- [ ] Skipping / force-closing mid-test and reopening resumes the correct step
- [ ] Exam date and course year are saved correctly in Settings after onboarding

---

## 3. Today tab

- [ ] Study plan tiles appear (vocab card, role-play, drill) when exam date is set
- [ ] Tapping a tile marks it checked; checkmark persists after background/foreground
- [ ] Streak counter increments after the first tile is completed each day
- [ ] Final-week mode notice appears when exam date ≤ 7 days away
- [ ] Empty state shows when no exam date is set (Settings prompt)

---

## 4. Practice tab

- [ ] All 4 scenario cards are visible
- [ ] Free badge only on "Noisy Room Complaint" and "Restaurant Allergy Order"
- [ ] Tapping a paid scenario when free → paywall opens
- [ ] All 6 vocab decks listed; only Front Office Basics tappable when free

---

## 5. Role-play conversation (core feature)

- [ ] Scenario loads; guest opening line appears in the chat bubble
- [ ] **iOS/Android**: hold-to-speak microphone records student speech; transcript appears
- [ ] **Web**: text input + Send button appear instead of microphone
- [ ] Student turn added to transcript; AI guest replies with contextually relevant Spanish
- [ ] AI does NOT give "No le he entendido" garbage reply on a valid transcript
- [ ] End-session button opens feedback / grading screen
- [ ] Back button from inside role-play returns to Practice tab without crashing

---

## 6. Vocab deck

- [ ] Cards load and display Spanish term on front
- [ ] Tap to flip reveals translation + example sentence
- [ ] Again / Hard / Good / Easy buttons apply SRS rating
- [ ] Deck session completes when all due cards are rated; shows summary
- [ ] Back from deck returns to Practice tab without crashing

---

## 7. Drill screen

- [ ] Register drill (usted vs tú) presents sentences; accepts voice or text answer
- [ ] Vocabulary drill shows cloze sentences; correct answer highlighted in green
- [ ] Completing a drill round shows a score + option to retry

---

## 8. Mock exam

- [ ] Prep screen lists four exam formats
- [ ] Free users can attempt 1 mock; second attempt → paywall
- [ ] Premium users can start unlimited mocks
- [ ] Grading screen loads after submission (spinner shown during API call)
- [ ] Feedback screen shows criterion breakdown (fluency / vocabulary / grammar / task / register)
- [ ] Score displayed as X/100 (total × 5)
- [ ] Top-3 fixes are actionable sentences, not generic

---

## 9. Paywall

- [ ] Feature comparison table renders correctly
- [ ] "Unlock Full Access" button triggers RevenueCat purchase sheet
- [ ] Successful purchase: celebration overlay → all content unlocked
- [ ] Restore purchase surfaces previously bought entitlement
- [ ] Cancelling purchase sheet dismisses silently (no error shown)
- [ ] Score banner visible when navigating from mock-exam feedback

---

## 10. Progress & Settings

- [ ] Progress tab shows empty state with CTA when no attempts exist
- [ ] Criterion chart renders after at least one graded attempt
- [ ] Settings: updating exam date persists across app restarts
- [ ] Delete account: confirmation dialog → account removed; redirects to auth screen

---

## Regression smoke test (run after every fix)

| Check | Pass? |
|---|---|
| No crash on cold launch | |
| Back navigation never crashes (no GO_BACK error) | |
| Role-play AI reply is contextual Spanish | |
| Today tab is not blank | |
| Placement test advances past completion | |
