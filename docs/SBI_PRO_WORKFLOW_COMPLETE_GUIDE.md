# DMIT Sessions – Complete Workflow Guide

This document explains the complete DMIT (Dermatoglyphics Multiple Intelligence Test) flow – who does what, when, and how all steps are completed.

---

## 1. Who Is Involved?

| Role | Who | What they do |
|------|-----|---------------|
| **User** | The person whose fingers are being analyzed | Verifies finger images, downloads Report at the end |
| **Trainer** | User with Designation_1 (handles DMIT) | Collects 10 finger images from user and uploads them |
| **Admin** | System admin | Fills finger analysis, uploads PDF Report, completes Session |

---

## 2. Prerequisites

1. **Appointment** – User has booked a DMIT appointment
2. **Designation** – Appointment is with **Designation 1 (Trainer)**
3. **Status** – Admin has **Accepted** the appointment  
   → DMIT session is automatically created when accepted

---

## 3. Complete Flow (Step-by-Step)

### STEP 1: Appointment Accept (Admin)

**Who:** Admin  
**Where:** Admin Panel → Appointments → Appointment Management

- View user's DMIT appointment
- **Accept** the appointment
- DMIT Session is created when accepted (status: **CREATED**)

---

### STEP 2: Finger Images Upload (Trainer)

**Who:** Trainer  
**Where:** User Portal → Appointments → DMIT

1. Trainer logs in with their account
2. Go to **Appointments → DMIT**, in "My Sessions (Trainer)" tab
3. List of assigned sessions will appear
4. Click **Open Session**
5. Upload **10 finger images**:
   - Left Thumb, Left Index, Left Middle, Left Ring, Left Little
   - Right Thumb, Right Index, Right Middle, Right Ring, Right Little
6. After uploading all 10, click **Submit for Verification**
7. Status changes to **VERIFICATION_PENDING**

**Progress:** 0/10 → 10/10 images

---

### STEP 3: User Verification (User whose fingers were scanned)

**Who:** User (the person whose fingers were scanned)  
**Where:** User Portal → Appointments → DMIT

1. User logs in with their account
2. Go to **Appointments → DMIT** – if pending, "Pending Verification" tab will open automatically
3. View your finger images (click View Images)
4. **Confirm** or **Reject** – confirmation modal will show before Confirm:
   - **Confirm** → Status changes to **ANALYSIS_PENDING**
   - **Reject** → Session becomes **REOPENED**, Trainer can re-upload

---

### STEP 4: Finger Analysis (Admin)

**Who:** Admin  
**Where:** Admin Panel → Appointments → DMIT Sessions

1. Open **DMIT Sessions** page
2. For session with status **ANALYSIS_PENDING**, in that row:
   - **View Finger Images** – to view images (optional)
   - **Finger Analysis** – to fill analysis
3. Click **Finger Analysis**
4. For each finger:
   - Select **Code** (L, R, X1, X2, W1, W2, W3, W4, W5, W6, W7, W8, W9)
   - Enter **Count** (0–99)
5. Click **Save Analysis**

---

### STEP 5: Report Upload (Admin)

**Who:** Admin  
**Where:** Admin Panel → DMIT Sessions (same page)

1. For session with status **ANALYSIS_PENDING**:
2. Click **Upload Report** button
3. Select PDF file (containing user's complete DMIT report)
4. Upload
5. Session status becomes **CLOSED**  
6. User will now see the Report

**Alternative:** If no PDF (e.g. report given offline), use **Mark Done** to close session – confirmation modal will show  
**Replace Report:** If wrong PDF was uploaded, use **Replace Report** button in CLOSED session to upload correct PDF

---

### STEP 6: User Report View (User)

**Who:** User (whose fingers were analyzed)  
**Where:** User Portal → Appointments → DMIT

1. User logs in and goes to **Appointments → DMIT**
2. In **My Reports** tab, completed reports will appear
3. Click **View Report**
4. PDF report will open – Download / View available

---

## 4. Admin Buttons – What They Do

| Button | When Enabled | What it does |
|--------|--------------|--------------|
| **View Finger Images** | When at least 1 image uploaded (by Trainer) | Opens modal to view 10 finger images |
| **Finger Analysis** | When images are uploaded | Opens form to fill codes and counts |
| **Upload Report** | When status is **ANALYSIS_PENDING** | Uploads PDF and completes session |
| **Mark Done** | When status is **ANALYSIS_PENDING** | Closes session without PDF (asks confirmation) |
| **Replace Report** | When status is **CLOSED** and reportUrl exists | Replaces wrong PDF with correct one |

---

## 5. Status Flow

```
CREATED
  ↓ (Trainer uploads images)
UPLOADING (1–9 images)
  ↓ (10 images complete)
UPLOADED
  ↓ (Trainer clicks Submit for Verification)
VERIFICATION_PENDING
  ↓ (User confirms)              OR    ↓ (User rejects)
ANALYSIS_PENDING                      REOPENED
  ↓ (Admin uploads PDF or Mark Done)       ↓ (Trainer re-uploads)
CLOSED                              UPLOADING...
```

---

## 6. Delete Finger Image (Admin)

- **View Finger Images** has **Delete** button with each image
- **Download All Images** has **Delete All Images** button beside it – delete all 10 images at once
- **Before** report upload – Delete button (single and All) stays **disabled**
- **After** report upload – Delete is enabled (for storage cleanup)

---

## 7. Quick Checklist

### Trainer

1. [ ] Login  
2. [ ] Open My DMIT Sessions  
3. [ ] Open Session  
4. [ ] Upload 10 finger images  
5. [ ] Submit for Verification  

### User (whose fingers)

1. [ ] Login  
2. [ ] Open Pending verification list  
3. [ ] View Finger images  
4. [ ] Confirm  

### Admin

1. [ ] Open DMIT Sessions page  
2. [ ] Perform **Finger Analysis** on Session and Save  
3. [ ] Click **Upload Report**  
4. [ ] Select PDF and Upload  
5. [ ] Session will be CLOSED  

---

## 8. Common Issues

| Problem | Solution |
|---------|----------|
| Upload Report disabled | User has not verified yet – status must be ANALYSIS_PENDING |
| View Finger Images disabled | Trainer has not uploaded images yet |
| My DMIT Reports empty | Admin has not uploaded report or session not CLOSED |
| No sessions in list | No DMIT appointment has been accepted (with Designation 1) |

---

## 9. URLs Reference

| Role | Page |
|------|------|
| Admin | `/admin/dmit-sessions` |
| User (all DMIT) | `/user/dmit` – Pending Verification, My Sessions, My Reports (tabs) |
