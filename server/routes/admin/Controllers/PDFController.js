const response = require("../../../config/response");
const PDFDocument = require("../../../models/PDFDocument");
const { uploadToR2, deleteFromR2 } = require("../../../helpers/r2Helper");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const deriveTypeFromTitle = (title) => {
  const t = (title || "").toLowerCase();
  if (t.includes("privacy")) return "policy";
  if (t.includes("term")) return "terms";
  if (t.includes("refund")) return "refund";
  if (t.includes("plan")) return "plan";
  return "misc";
};

const ALLOWED_PDF_TYPES = new Set(["policy", "terms", "refund", "plan", "misc"]);

/**
 * @route POST /api/admin/pdfs
 * @desc Upload a new PDF document
 */
const createPDF = async (req, res) => {
  try {
    const { title, type, isActive, displayOrder } = req.body;

    if (!title || !title.trim()) {
      return response.errorResponse(
        res,
        [{ path: "title", msg: "Title is required" }],
        "Title is required",
        400,
      );
    }

    if (!req.file) {
      return response.errorResponse(
        res,
        [{ path: "file", msg: "PDF file is required" }],
        "PDF file is required",
        400,
      );
    }

    // Validate PDF file type
    if (req.file.mimetype !== "application/pdf") {
      return response.errorResponse(
        res,
        [{ path: "file", msg: "Only PDF files are allowed" }],
        "Only PDF files are allowed",
        400,
      );
    }

    // Ensure unique title (case-insensitive)
    const normalizedTitle = title.trim();
    const existingWithTitle = await PDFDocument.findOne({
      title: {
        $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, "i"),
      },
    });
    if (existingWithTitle) {
      return response.errorResponse(
        res,
        [{ path: "title", msg: "A PDF already exists for this title." }],
        "A PDF already exists for this title.",
        400,
      );
    }

    // Upload PDF to R2
    const uploadResult = await uploadToR2(req.file, "pdfs");

    // Create PDF document
    const pdfDocument = new PDFDocument({
      title: normalizedTitle,
      type: ALLOWED_PDF_TYPES.has(type)
        ? type
        : deriveTypeFromTitle(normalizedTitle),
      fileName: req.file.originalname || "document.pdf",
      fileUrl: uploadResult.url,
      fileKey: uploadResult.key,
      fileSize: uploadResult.size,
      isActive:
        isActive !== undefined
          ? isActive === "true" || isActive === true
          : true,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      createdBy: req.user.id,
    });

    await pdfDocument.save();

    return response.successResponse(
      res,
      pdfDocument,
      "PDF document uploaded successfully",
    );
  } catch (error) {
    console.error("Error creating PDF document:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to upload PDF document",
      500,
    );
  }
};

/**
 * @route GET /api/admin/pdfs
 * @desc Get all PDF documents
 */
const getPDFs = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "displayOrder",
      ascending = "asc",
      type,
      isActive,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};
    if (type) {
      query.type = type;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    const [data, totalRecord] = await Promise.all([
      PDFDocument.find(query)
        .populate("createdBy", "name email")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      PDFDocument.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: parseInt(page),
              per_page: pageSize,
            },
          ],
          data,
        },
      ],
      "PDF documents fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching PDF documents:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch PDF documents",
      500,
    );
  }
};

/**
 * @route GET /api/admin/pdfs/:id
 * @desc Get PDF document by ID
 */
const getPDFById = async (req, res) => {
  try {
    const { id } = req.params;

    const pdfDocument = await PDFDocument.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!pdfDocument) {
      return response.errorResponse(res, {}, "PDF document not found", 404);
    }

    return response.successResponse(
      res,
      pdfDocument,
      "PDF document fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching PDF document:", error);
    return response.errorResponse(res, {}, "Failed to fetch PDF document", 500);
  }
};

/**
 * @route PUT /api/admin/pdfs/:id
 * @desc Update PDF document
 */
const updatePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, isActive, displayOrder } = req.body;

    const pdfDocument = await PDFDocument.findById(id);

    if (!pdfDocument) {
      return response.errorResponse(res, {}, "PDF document not found", 404);
    }

    // Update text fields
    if (title !== undefined) {
      const normalizedTitle = title.trim();

      // If title is changing, enforce uniqueness
      if (
        normalizedTitle.toLowerCase() !==
        (pdfDocument.title || "").toLowerCase()
      ) {
        const existingWithTitle = await PDFDocument.findOne({
          _id: { $ne: pdfDocument._id },
          title: {
            $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, "i"),
          },
        });
        if (existingWithTitle) {
          return response.errorResponse(
            res,
            [{ path: "title", msg: "A PDF already exists for this title." }],
            "A PDF already exists for this title.",
            400,
          );
        }
      }

      pdfDocument.title = normalizedTitle;
    }
    if (displayOrder !== undefined)
      pdfDocument.displayOrder = parseInt(displayOrder);
    if (isActive !== undefined) {
      pdfDocument.isActive = isActive === "true" || isActive === true;
    }

    if (type !== undefined && ALLOWED_PDF_TYPES.has(type)) {
      pdfDocument.type = type;
    } else if (!pdfDocument.type) {
      pdfDocument.type = deriveTypeFromTitle(pdfDocument.title);
    }

    // Handle file update if new file is provided
    if (req.file) {
      // Validate PDF file type
      if (req.file.mimetype !== "application/pdf") {
        return response.errorResponse(
          res,
          [{ path: "file", msg: "Only PDF files are allowed" }],
          "Only PDF files are allowed",
          400,
        );
      }

      // Delete old file from R2 if exists
      if (pdfDocument.fileKey) {
        try {
          await deleteFromR2(pdfDocument.fileKey);
        } catch (deleteError) {
          console.error("Error deleting old PDF from R2:", deleteError);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new file
      const uploadResult = await uploadToR2(req.file, "pdfs");
      pdfDocument.fileUrl = uploadResult.url;
      pdfDocument.fileKey = uploadResult.key;
      pdfDocument.fileName = req.file.originalname || pdfDocument.fileName;
      pdfDocument.fileSize = uploadResult.size;
    }

    await pdfDocument.save();

    return response.successResponse(
      res,
      pdfDocument,
      "PDF document updated successfully",
    );
  } catch (error) {
    console.error("Error updating PDF document:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update PDF document",
      500,
    );
  }
};

/**
 * @route DELETE /api/admin/pdfs/:id
 * @desc Delete PDF document
 */
const deletePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const pdfDocument = await PDFDocument.findById(id);

    if (!pdfDocument) {
      return response.errorResponse(res, {}, "PDF document not found", 404);
    }

    // Delete file from R2 if exists
    if (pdfDocument.fileKey) {
      try {
        await deleteFromR2(pdfDocument.fileKey);
      } catch (deleteError) {
        console.error("Error deleting PDF from R2:", deleteError);
        // Continue with DB deletion even if R2 deletion fails
      }
    }

    // Delete from database
    await PDFDocument.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "PDF document deleted successfully",
    );
  } catch (error) {
    console.error("Error deleting PDF document:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete PDF document",
      500,
    );
  }
};

/**
 * @route GET /api/common/pdfs
 * @desc Get active PDF documents (public)
 */
const getPublicPDFs = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    if (type) {
      query.type = type;
    }

    const pdfDocuments = await PDFDocument.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("title type fileName fileUrl fileSize displayOrder createdAt")
      .lean();

    return response.successResponse(
      res,
      pdfDocuments,
      "Active PDF documents fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching public PDF documents:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch PDF documents",
      500,
    );
  }
};

module.exports = {
  createPDF,
  getPDFs,
  getPDFById,
  updatePDF,
  deletePDF,
  getPublicPDFs,
};
