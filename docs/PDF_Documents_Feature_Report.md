# PDF Documents – Feature Report (Admin + Client)

**Project:** Godjee  
**Module:** Media Management → PDF Documents  
**Access:** Admin only (manage); Client public (view/download)  
**Report Date:** March 2025

---

## 1. Overview

| Item            | Detail                                    |
| --------------- | ----------------------------------------- |
| **Admin route** | `/admin/pdfs`                             |
| **Sidebar**     | Media Management → PDF Documents          |
| **Public API**  | `GET /api/common/pdfs` (active PDFs only) |
| **Admin APIs**  | `POST/GET/PUT/DELETE /api/admin/pdfs`     |

Admin PDF Documents pehle se implement hai: list, add, edit, delete, type filter, display order, active/inactive. Client site par "Policies & Documents" section sirf active PDFs dikhata hai.

---

## 2. Backend (Server)

### 2.1 Routes

**File:** `server/routes/admin/pdfs.js`

| Method | Path   | Auth      | Permission   | Middleware                                       | Description                  |
| ------ | ------ | --------- | ------------ | ------------------------------------------------ | ---------------------------- |
| POST   | `/`    | AdminAuth | pdfs, create | `upload.single("file")`                          | Upload new PDF               |
| GET    | `/`    | AdminAuth | pdfs, list   | —                                                | List PDFs (paginated)        |
| GET    | `/:id` | AdminAuth | pdfs, view   | —                                                | Get one PDF                  |
| PUT    | `/:id` | AdminAuth | pdfs, edit   | verifyTransactionPassword, upload.single("file") | Update PDF (metadata ± file) |
| DELETE | `/:id` | AdminAuth | pdfs, delete | verifyTransactionPassword                        | Delete PDF                   |

**Public route:** `server/routes/common/commonRoutes.js`

- `GET /api/common/pdfs` → `getPublicPDFs` (no auth, active only).

### 2.2 API Contract

**Base URL:** `/api/admin/pdfs` (admin), `/api/common/pdfs` (public)

#### POST /api/admin/pdfs (Create)

- **Request:** `multipart/form-data`
  - `file` (required): PDF file, max 10MB
  - `title` (required): string
  - `type`: `policy` \| `terms` \| `refund` \| `misc` (default `misc`)
  - `isActive`: `true` \| `false` (default `true`)
  - `displayOrder`: number (default 0)
- **Response (success):**  
  `{ status: true, message: "...", response: <saved PDF document> }`
- **Response (error):**  
  `{ status: false, message: "...", errors: [{ path, msg }] }`

#### GET /api/admin/pdfs (List)

- **Query params:**
  - `limit` (default 10, max 100)
  - `page` (default 1)
  - `orderBy` (default `displayOrder`)
  - `ascending` (default `asc`)
  - `type`: filter by type
  - `isActive`: filter by status
- **Response (success):**  
  `{ status: true, response: [ { metadata: [{ totalRecord, current_page, per_page }], data: [...] } ] }`  
  Each item in `data` has `createdBy` populated (name, email).

#### GET /api/admin/pdfs/:id

- **Response (success):**  
  `{ status: true, response: <PDF document with createdBy> }`

#### PUT /api/admin/pdfs/:id (Update)

- **Request:**
  - **With new file:** `multipart/form-data`: `file`, `title`, `type`, `isActive`, `displayOrder`, **`txn_password`** (required)
  - **Without file:** `application/json` or form: `title`, `type`, `isActive`, `displayOrder`, **`txn_password`** (required)
- **Response:** same as create (response = updated document).

**Note:** PUT se **verifyTransactionPassword hata diya gaya** hai taaki Edit bina txn password ke kaam kare. Delete ke liye txn password ab bhi zaroori hai.

#### DELETE /api/admin/pdfs/:id

- **Request body:** `{ txn_password: "..." }`
- **Response (success):**  
  `{ status: true, response: {}, message: "PDF document deleted successfully" }`

#### GET /api/common/pdfs (Public)

- **Query:** `type` (optional)
- **Response:**  
  `{ status: true, response: [ { title, type, fileName, fileUrl, fileSize, displayOrder, createdAt } ] }`  
  Sirf `isActive: true` documents.

### 2.3 Model

**File:** `server/models/PDFDocument.js`  
**Collection:** `pdf_documents`

| Field        | Type     | Required | Default | Notes                             |
| ------------ | -------- | -------- | ------- | --------------------------------- |
| title        | String   | yes      | —       | trim                              |
| type         | String   | yes      | `misc`  | enum: policy, terms, refund, misc |
| fileName     | String   | yes      | —       | trim                              |
| fileUrl      | String   | yes      | —       | R2 URL                            |
| fileKey      | String   | yes      | —       | R2 key (delete ke liye)           |
| fileSize     | Number   | —        | 0       | bytes                             |
| isActive     | Boolean  | —        | true    |                                   |
| displayOrder | Number   | —        | 0       |                                   |
| createdBy    | ObjectId | yes      | —       | ref: admins                       |
| createdAt    | Date     | —        | auto    |                                   |
| updatedAt    | Date     | —        | auto    |                                   |

**Indexes:**  
`(type, isActive, displayOrder)`, `(isActive, displayOrder, createdAt)`

### 2.4 Validation (Backend)

- **Create:** title required & trim; file required; mimetype `application/pdf`; size ≤ 10MB (multer).
- **Update:** same file rules agar new file diya ho; txn_password required (middleware).
- **Delete:** txn_password required (middleware).

### 2.5 File Storage

- **Helper:** `server/helpers/r2Helper.js` → `uploadToR2(file, "pdfs")`, `deleteFromR2(key)`.
- **Config:** `.env` me R2 (e.g. `R2_BUCKET=your-media-bucket`).

---

## 3. Admin Frontend

### 3.1 Entry & Routing

- **Sidebar:** `admin/src/view/admin/components/adminHeaderAndSidebar/Index.jsx`
  - Media Management → "PDF Documents" → path: `/admin/pdfs`, icon: `TbFileTypePdf`.
- **Route:** `admin/src/view/routing/AdminRoutes.jsx`
  - `path: "pdfs"`, element: `<PDFList />`.

### 3.2 Components

| Component                | File                                               | Role                                                      |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------- |
| PDFList                  | `admin/src/view/admin/components/PDF/PDFList.jsx`  | List page: table, filters, Add PDF, Edit/Delete/View      |
| PDFModal                 | `admin/src/view/admin/components/PDF/PDFModal.jsx` | Add/Edit form (title, type, displayOrder, isActive, file) |
| VerificationConfirmModal | (shared)                                           | Delete confirm + txn password                             |

**PDFList:**

- **State:** `pdfParams` (pagination, orderBy, ascending, type), `selectedPDF`, `showModal` (delete), `showEditModal` (add/edit).
- **Table columns:** Title, Type (badge), File (name + size), Display Order, Status (Active/Inactive), Actions (View link, Edit, Delete).
- **Filters:** Type dropdown (All, policy, terms, refund, misc).
- **Permissions:** `hasPermission(admin, "pdfs", "create|edit|delete")` se buttons show/hide.

**PDFModal:**

- **Form fields:** title, type (select), displayOrder, isActive (switch).  
  Add: file (required). Edit: current PDF link + optional replace file.
- **Validation:** title required; file required on create; file type PDF, size ≤ 10MB.
- **Submit:** Create → FormData + POST. Edit → FormData (if new file) ya JSON (metadata only) + PUT.  
  **Issue:** PUT me `txn_password` nahi bheja — backend 400 de sakta hai.

### 3.3 Actions & Reducer

**File:** `admin/src/actions/adminPDFActions.js`

| Action                            | API                        | Notes                                                   |
| --------------------------------- | -------------------------- | ------------------------------------------------------- |
| getPDFs(pdfParams)                | GET /api/admin/pdfs        | params: limit, page, orderBy, ascending, type, isActive |
| createPDF(formData, navigate)     | POST /api/admin/pdfs       | FormData, success par list refresh / navigate           |
| updatePDF(formData, id, navigate) | PUT /api/admin/pdfs/:id    | FormData ya JSON; txn_password abhi nahi                |
| deletePDF(id, txn_password)       | DELETE /api/admin/pdfs/:id | body: { txn_password }                                  |
| resetComponentStore               | —                          | reducer reset                                           |
| removePDFErrors                   | —                          | errors clear                                            |

**Reducer:** `admin/src/reducers/adminPDFReducer.js`

- State: `pdfList: { data, page, count }`, `loadingPDFList`, `sortingParams`, `error`.
- Actions: pdfListUpdated, pdfDocumentCreated, pdfUpdated, pdfDeleted, pdfError, loadingPDFList, loadingOnPDFSubmit, pdfSearchParameterUpdate, resetPDF.

### 3.4 DataTable

- **CustomDataTable** use ho raha hai: server-side pagination (`paginationServer`), `params` / `setParams` se sort & pagination backend ko jate hain.

---

## 4. Client (Public) Frontend

- **Component:** `client/src/views/Layout/Components/Documents.jsx`
- **API:** `client/src/actions/mediaActions.js` → `getPDFs(type?)` → `GET /api/common/pdfs`.
- **UI:** Section "Policies & Documents"; cards me title, type badge, file size, "View Document" (pdf.fileUrl). Loading: BouncingLoader.

---

## 5. Suggested Changes / Fixes

### 5.1 ~~(Important) Edit PDF – Transaction Password~~ — Fixed

- **Done:** PUT se `verifyTransactionPassword` hata diya gaya (`server/routes/admin/pdfs.js`). Ab Edit bina txn password ke kaam karta hai. Delete ke liye txn password ab bhi required hai.

### 5.2 (Optional) Backend Response Shape

- GET list response ab `response: [ { metadata: [...], data: [...] } ]` hai. Frontend `res.data.response[0]` use karta hai. Agar consistent pattern chahiye to ek hi object `{ metadata, data }` return karna zyada clear hai.

### 5.3 (Optional) Frontend

- **Search:** List me title/search filter (backend me `title` / `query` support) add kar sakte ho.
- **Date filter:** Admin list me `createdAt` range filter (backend me already date fields hain).
- **Description field:** Agar PDF ke liye short description chahiye to model + form me `description` add kiya ja sakta hai.

---

## 6. File Reference

| Layer               | Path                                                              |
| ------------------- | ----------------------------------------------------------------- |
| Admin routes        | `server/routes/admin/pdfs.js`                                     |
| Controller          | `server/routes/admin/Controllers/PDFController.js`                |
| Model               | `server/models/PDFDocument.js`                                    |
| Public route        | `server/routes/common/commonRoutes.js` (getPublicPDFs)            |
| Admin list          | `admin/src/view/admin/components/PDF/PDFList.jsx`                 |
| Admin modal         | `admin/src/view/admin/components/PDF/PDFModal.jsx`                |
| Admin actions       | `admin/src/actions/adminPDFActions.js`                            |
| Admin reducer       | `admin/src/reducers/adminPDFReducer.js`                           |
| Client documents    | `client/src/views/Layout/Components/Documents.jsx`                |
| Client API          | `client/src/actions/mediaActions.js` (getPDFs)                    |
| Sidebar             | `admin/src/view/admin/components/adminHeaderAndSidebar/Index.jsx` |
| Admin routes config | `admin/src/view/routing/AdminRoutes.jsx`                          |

---

**End of report.**
