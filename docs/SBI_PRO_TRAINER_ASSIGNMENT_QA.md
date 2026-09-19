# DMIT Trainer Assignment – Q&A Document

**Date:** March 4, 2025  
**Purpose:** Pehle in sawalon ke jawab diye jayen, phir implementation start hogi.

---

## Part 1: Fingerprint Lock – One Trainer Per User (Forever)

**Rule:** Jab tak DMIT session CLOSED nahi (Admin ne Finger Analysis + Report Upload ya Mark Done kar diya), tab tak koi aur TRAINER us user (fingerprint wale) ko assign nahi kar sakta. Fingerprints kabhi change nahi hote.

### Q1.1 – "User" ka matlab

Lock kis par lagta hai?

- **A)** Sirf woh person jiske fingers ki analysis hui (DMIT session ka `userId`)  
- **B)** Woh person jisne appointment book kiya (`requesterId`)  
- **C)** Dono alag hain – booker aur fingerprint person different ho sakte hain

*Current system:* `userId` = `requesterId` (booker = fingerprint person)

---

### Q1.2 – Lock trigger

Kab lock active hota hai?

- **A)** Jaise hi Admin ne **Finger Analysis save** kiya (Steady, Arch, Dominant, Compliant, Count bhar diya)  
- **B)** Jab Admin ne **Report Upload** ya **Mark Done** kiya (session CLOSED)  
- **C)** Dono steps complete hone par

---

### Q1.3 – Lock scope

Lock hone par kya hota hai?

- **A)** Us `userId` (fingerprint wale) ko **kisi bhi** Trainer ke saath naya DMIT appointment book nahi kar sakta  
- **B)** Sirf us **same Trainer** ke saath dobara book nahi kar sakta (lekin kisi **dusre** Trainer ke saath kar sakta hai)  
- **C)** Kuch aur (please specify)

---

### Q1.4 – Booking block

Agar koi user already kisi Trainer ke saath DMIT complete kar chuka hai, aur woh dobara book kare to:

- **A)** Booking hi block – error message: "Aapka DMIT pehle hi complete ho chuka hai"  
- **B)** Sirf Designation 1 (DMIT) block, baaki designations allowed  
- **C)** Kuch aur

---

## Part 2: Booking For Others (Bachche, Wife, Bhai – Kisi Ki Bhi)

**Scenario:** User khud ki nahi, balki kisi aur ki Finger Analysis karwana chahta hai (child, wife, brother – relation zaroori nahi).

### Q2.1 – Beneficiary login

Jis person ki fingerprint analysis hogi, usko login chahiye?

- **A)** Haan – beneficiary ko bhi system mein **user account** hona chahiye, taaki verification kar sake  
- **B)** Nahi – beneficiary account nahi chahiye; booker (requester) hi verification kar dega  
- **C)** Nahi – beneficiary ko OTP / magic link bhej ke verify karwayenge (no account)

---

### Q2.2 – Beneficiary account type

Agar beneficiary ko account chahiye:

- **A)** Full User account (phone, password, memberId) – normal registration  
- **B)** Lightweight "dependent" / "family member" type – booker ke andar add karke  
- **C)** Sirf phone number + OTP – koi permanent account nahi

---

### Q2.3 – Verification responsibility

Jab booker ne bachche/patni/bhai ke liye book kiya:

- **A)** Finger images ki verification **beneficiary** kare (agar account hai to login karke)  
- **B)** Booker (requester) hi verify kare – "Maine sahi images upload ki hain"  
- **C)** Dono option – beneficiary prefer, nahi to booker verify kar sakta hai

---

### Q2.4 – Report access

Report kisko milegi?

- **A)** Sirf beneficiary ko (jiske fingers the)  
- **B)** Sirf booker ko (jisne book kiya)  
- **C)** Dono ko – beneficiary aur booker dono access karein

---

### Q2.5 – Fingerprint lock beneficiary par

Agar A (child) ki analysis Trainer X ke saath complete ho gayi:

- **A)** A (beneficiary) ko ab kisi bhi Trainer ke saath DMIT book nahi kar sakta – lock A par  
- **B)** Booker (parent) ko limit – wo A ke liye dobara book nahi kar sakta, lekin apne liye ya B (dusre bachche) ke liye kar sakta  
- **C)** Dono – A locked + booker ke liye bhi A-specific rule

---

## Part 3: Professional UI – User Ko Kya Dikhna Chahiye / Nahi

**Goal:** Jitna professional ho sake – jaise baaki astrologers karte hain. User ko free/paid, count, time details visible nahi hone chahiye.

### Q3.1 – Slot display

Time slots kaisa dikhein?

- **A)** Sirf "Available" / "Not Available" – time, label, capacity bilkul hide  
- **B)** Time dikhe (e.g. 10:00 AM) lekin "X/Y booked" ya "free/paid" na dikhe  
- **C)** Time + label dikhe, lekin capacity / booked count hide  
- **D)** Ab bhi sab dikhe (current: time, label, booked/capacity) – koi change nahi

---

### Q3.2 – Holder list

Trainer (holder) list mein kya dikhe?

- **A)** Sirf Name + Member ID – Sessions, Rating, Online/Offline hide  
- **B)** Name, Member ID, Online status – Sessions/Rating hide  
- **C)** Sab dikhe (current) – koi change nahi

---

### Q3.3 – Free vs Paid sessions

User ko pata chalna chahiye ki free kitne bache, paid kitne?

- **A)** Bilkul nahi – free/paid count hide, sirf "Book" button  
- **B)** Sirf jab free khatam ho – tab "Pay required" type message  
- **C)** Kabhi bhi nahi – system internally handle kare, user ko pata hi na ho

---

### Q3.4 – Designation-specific UI

Kya DMIT (Designation 1) ke liye **alag** Book Appointment page / flow hona chahiye?

- **A)** Haan – DMIT ke liye dedicated flow (e.g. "Book DMIT Session") alag se  
- **B)** Nahi – same "Book Appointment" page, lekin Designation 1 select karne par DMIT-specific fields/flow  
- **C)** Same page, same flow – sirf backend rules change (lock, etc.)

---

## Part 4: TRAINER Assignment – Systematic Flow

### Q4.1 – Trainer selection

User ko Trainer kaise choose karna chahiye?

- **A)** List se select – sab eligible Trainers dikhein (lock wale exclude)  
- **B)** Admin assign kare – user khud Trainer choose na kare  
- **C)** Geographic / downline priority – pehle nearby ya same downline ke Trainers

---

### Q4.2 – "Pass" / Assignment meaning

"TRAINER har user k pass only 1st time assign hoga" – iska exact matlab?

- **A)** Har user (fingerprint person) ke saath sirf **ek hi Trainer** kabhi bhi link hoga – pehli baar jo complete ho, wohi final  
- **B)** User ko pehli baar jo Trainer mile, usi ke saath forever – change nahi hoga  
- **C)** Kuch aur (please clarify)

---

### Q4.3 – Multiple DMIT for same person

Kya same person (same fingerprints) ke liye **dobar** DMIT possible hona chahiye?

- **A)** Nahi – ek hi baar lifetime (fingerprint never changes)  
- **B)** Haan – agar **same Trainer** hai to (e.g. yearly follow-up)  
- **C)** Haan – kisi bhi Trainer ke saath, lekin extra payment / admin approval

---

## Part 5: Technical / Edge Cases

### Q5.1 – Reject flow

User ne images **Reject** kar diye → Session REOPENED → Trainer re-upload karta hai.  
Kya is flow mein bhi lock lagta hai?

- **A)** Nahi – lock sirf CLOSED (Report/Mark Done) par  
- **B)** Haan – agar Finger Analysis save ho chuka tha, phir bhi lock  
- **C)** Reject ke baad lock temporary remove – dobara complete hone par lag jaye

---

### Q5.2 – Report Replace

Admin ne **Replace Report** kiya (galat PDF ko sahi se replace).  
Lock status par koi farq?

- **A)** Nahi – lock pehle hi lag chuka hai  
- **B)** Replace ke baad bhi same – koi change nahi

---

### Q5.3 – Mark Done (no PDF)

Admin ne **Mark Done** kiya – PDF upload nahi kiya.  
Lock same hi?

- **A)** Haan – Mark Done = CLOSED = lock active  
- **B)** Nahi – lock sirf Report Upload par  
- **C)** Kuch aur

---

## Part 6: Summary Checklist – Aapke Jawab ✅

```text
Q1.1: C) Dono alag hain – booker aur fingerprint person different ho sakte hain
Q1.2: C) Dono steps complete hone par (Finger Analysis + Report/Mark Done)
Q1.3: C) Booker apne, bhai, wife, colleague, known person – sab ke liye option. Lock beneficiary par. DEEP QA: confusions – separate implement karna padega.
Q1.4: B) Sirf Designation 1 (DMIT) block, baaki designations allowed — DEEP QA needed
Q2.1: B) Nahi – beneficiary account nahi chahiye; booker (requester) hi verification kar dega
Q2.2: B) Lightweight dependent – Not needed, agar zaruri ho to Option B
Q2.3: Flow same – order pe shift kar sakte. Booker 3 orders sath create kar sakta (1 mera, 1 wife, 1 papa). Sab reports booker ki ID pe. Trainer upload, user verify, admin report. Same user rules apply.
Q2.4: B) Sirf booker ko – jis ID se book kiya usi pe report
Q2.5: A) Lock beneficiary (finger person) par. Finger details ek bar upload = kabhi change nahi. Admin hi bypass – user call karke "finger analysis vapas kro" bol dega, admin direct trainer assign karega.
Q3.1: FULL ADVANCED HIGH TECH – free/paid, count, time sab visible. Professional, advanced.
Q3.2: B) + Name, Member ID, Online status, Sessions, Rating, Phone number – sab dikhe
Q3.3: B) Free khatam par "Pay required". Remaining count dikhao, fix time use karo nahi to expire. Admin manage karega.
Q3.4: B) Same Book Appointment page, Designation 1 select = DMIT-specific fields/flow
Q4.1: C + A) Dono – Geographic/downline priority + List se select. Both options.
Q4.2: C) User A = DMIT complete. User A ko kabhi kisi trainer ki zarurat nahi (fingerprint never changes). Gadbad = admin se connect, admin direct trainer assign karega. User khud nahi kar sakta.
Q4.3: A) Nahi – ek hi baar lifetime (fingerprint never changes)
Q5.1: A) Nahi – lock sirf CLOSED (Report/Mark Done) par
Q5.2: A) Nahi – lock pehle hi lag chuka hai, Replace par koi farq nahi
Q5.3: A) Haan – Mark Done = CLOSED = lock active
```

**Status:** Answers recorded. See `DMIT_DEEP_QA_REPORT.md` for follow-up questions.
