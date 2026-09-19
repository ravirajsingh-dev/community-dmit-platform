import React, { useEffect, useState } from "react";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { Container, Row, Col, Form, Button, Card } from "react-bootstrap";

// icons
import { MdEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";

// custom imports
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import Errors from "@src/notifications/Errors";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import {
  getCommonSettings,
  updateCommonSettings,
  resetComponentStore,
} from "@src/actions/adminCommonSettingsActions";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";

const ApplicationSettings = ({
  setErrors,
  errorList,
  getCommonSettings,
  updateCommonSettings,
  resetComponentStore,
  adminCommonSettings: {
    commonSettings,
    loadingCommonSettings,
    loadingOnSubmit,
  },
}) => {
  // Initial form data structure
  const initialFormData = {
    // General Information
    name: "",
    abbreviation: "",
    contactUs: "",
    email: "",
    address: "",
    logo: null,
    logoUrl: "",
    heroBrainImage: null,
    heroBrainUrl: "",

    // Social Media Links
    socialMedia: {
      instagram: "",
      facebook: "",
      youtube: "",
      zoomMeeting: "",
    },

    // Donation Settings
    donationEnabled: true,
    donationMessage: "",

    // Marquee Settings
    marqueeEnabled: false,
    marqueeMessage: "",
    marqueeType: "warning",

    // Authentication Settings
    loginEnabled: true,
    registerEnabled: true,

    // UPI Details
    upi: {
      upiId: "",
      upiHolderName: "",
    },

    // Bank Details
    bank: {
      bankName: "",
      accountNo: "",
      accountHolderName: "",
      ifscCode: "",
    },

    // About Us Page Content
    aboutUs: {
      title: "",
      description: "",
      mission: "",
      vision: "",
    },

    // Contact Us Page Content
    contactUsPage: {
      phone: "",
      secondaryPhone: "",
      email: "",
      address: "",
    },

    // Coming Soon Page Content
    comingSoon: {
      enabled: false,
      title: "",
      description: "",
      initiatives: [],
    },

    // Homepage (SBI Pro)
    homepage: {
      hero: {
        title: "Unlock Your Brain's Full Potential",
        subheading:
          "Advanced Intelligence Analysis for Optimal Mental Performance.",
        ctaPrimaryText: "Get Started",
        ctaPrimaryLink: "/login",
        ctaSecondaryText: "Learn More",
        ctaSecondaryLink: "/about-us",
        showBannerSlider: false,
      },
      keyFeatures: {
        enabled: true,
        title: "Our Key Features",
        description:
          "Explore the advanced tools and insights designed to enhance your cognitive performance.",
        items: [],
      },
      howItWorks: {
        enabled: true,
        tag: "SBI PRO ANALYSIS",
        title: "How SBI Pro Analysis Works",
        steps: [],
      },
    },
  };

  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [onlyOnce, setOnce] = useState(true);
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [heroBrainPreview, setHeroBrainPreview] = useState(null);

  const toggleEdit = () => setDisabled(!isDisabled);

  // Fetch settings on component mount
  useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    getCommonSettings();
  }, [getCommonSettings, resetComponentStore]);

  // Update form data when settings are fetched
  useEffect(() => {
    if (commonSettings && Object.keys(commonSettings).length > 0) {
      setFormData({
        name: commonSettings.name || "",
        abbreviation: commonSettings.abbreviation || "",
        contactUs: commonSettings.contactUs || "",
        email: commonSettings.email || "",
        address: commonSettings.address || "",
        socialMedia: {
          instagram: commonSettings.socialMedia?.instagram || "",
          facebook: commonSettings.socialMedia?.facebook || "",
          youtube: commonSettings.socialMedia?.youtube || "",
          zoomMeeting: commonSettings.socialMedia?.zoomMeeting || "",
        },
        donationEnabled:
          commonSettings.donationEnabled !== undefined
            ? commonSettings.donationEnabled
            : true,
        donationMessage: commonSettings.donationMessage || "",
        marqueeEnabled:
          commonSettings.marqueeEnabled !== undefined
            ? commonSettings.marqueeEnabled
            : false,
        marqueeMessage: commonSettings.marqueeMessage || "",
        marqueeType: commonSettings.marqueeType || "warning",
        loginEnabled:
          commonSettings.loginEnabled !== undefined
            ? commonSettings.loginEnabled
            : true,
        registerEnabled:
          commonSettings.registerEnabled !== undefined
            ? commonSettings.registerEnabled
            : true,
        upi: {
          upiId: commonSettings.upi?.upiId || "",
          upiHolderName: commonSettings.upi?.upiHolderName || "",
        },
        bank: {
          bankName: commonSettings.bank?.bankName || "",
          accountNo: commonSettings.bank?.accountNo || "",
          accountHolderName: commonSettings.bank?.accountHolderName || "",
          ifscCode: commonSettings.bank?.ifscCode || "",
        },
        aboutUs: {
          title: commonSettings.aboutUs?.title || "",
          description: commonSettings.aboutUs?.description || "",
          mission: commonSettings.aboutUs?.mission || "",
          vision: commonSettings.aboutUs?.vision || "",
        },
        contactUsPage: {
          phone: commonSettings.contactUsPage?.phone || "",
          secondaryPhone: commonSettings.contactUsPage?.secondaryPhone || "",
          email: commonSettings.contactUsPage?.email || "",
          address: commonSettings.contactUsPage?.address || "",
        },
        comingSoon: {
          enabled:
            commonSettings.comingSoon?.enabled !== undefined
              ? commonSettings.comingSoon.enabled
              : false,
          title: commonSettings.comingSoon?.title || "",
          description: commonSettings.comingSoon?.description || "",
          initiatives: commonSettings.comingSoon?.initiatives || [],
        },
        homepage: {
          hero: {
            title:
              commonSettings.homepage?.hero?.title ||
              "Unlock Your Brain's Full Potential",
            subheading:
              commonSettings.homepage?.hero?.subheading ||
              "Advanced Intelligence Analysis for Optimal Mental Performance.",
            ctaPrimaryText:
              commonSettings.homepage?.hero?.ctaPrimaryText || "Get Started",
            ctaPrimaryLink:
              commonSettings.homepage?.hero?.ctaPrimaryLink || "/login",
            ctaSecondaryText:
              commonSettings.homepage?.hero?.ctaSecondaryText || "Learn More",
            ctaSecondaryLink:
              commonSettings.homepage?.hero?.ctaSecondaryLink || "/about-us",
            showBannerSlider:
              commonSettings.homepage?.hero?.showBannerSlider === true,
          },
          keyFeatures: {
            enabled:
              commonSettings.homepage?.keyFeatures?.enabled !== false,
            title:
              commonSettings.homepage?.keyFeatures?.title || "Our Key Features",
            description:
              commonSettings.homepage?.keyFeatures?.description ||
              "Explore the advanced tools and insights designed to enhance your cognitive performance.",
            items: commonSettings.homepage?.keyFeatures?.items || [],
          },
          howItWorks: {
            enabled:
              commonSettings.homepage?.howItWorks?.enabled !== false,
            tag:
              commonSettings.homepage?.howItWorks?.tag || "SBI PRO ANALYSIS",
            title:
              commonSettings.homepage?.howItWorks?.title ||
              "How SBI Pro Analysis Works",
            steps: commonSettings.homepage?.howItWorks?.steps || [],
          },
        },
      });
      // Set logo preview if logoUrl exists
      if (commonSettings.logoUrl) {
        setLogoPreview(commonSettings.logoUrl);
      } else {
        setLogoPreview(null);
      }
      // Set hero brain preview if exists
      if (commonSettings.heroBrainUrl) {
        setHeroBrainPreview(commonSettings.heroBrainUrl);
      } else {
        setHeroBrainPreview(null);
      }
    }
  }, [commonSettings]);

  // Handle logo file change
  const onLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors([{ path: "logo", msg: "Logo size must be less than 2MB" }]);
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors([
          {
            path: "logo",
            msg: "Only jpg, jpeg, png, and webp images are allowed",
          },
        ]);
        return;
      }

      setFormData({ ...formData, logo: file });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle hero brain image change
  const onHeroBrainChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors([
          { path: "heroBrainImage", msg: "Image size must be less than 2MB" },
        ]);
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors([
          {
            path: "heroBrainImage",
            msg: "Only jpg, jpeg, png, and webp images are allowed",
          },
        ]);
        return;
      }

      setFormData({ ...formData, heroBrainImage: file });

      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroBrainPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle input changes
  const onChange = (e) => {
    if (!e.target) {
      return;
    }

    const { name, value, type, checked } = e.target;

    // Handle deep nested homepage (e.g. homepage.hero.title)
    if (name.startsWith("homepage.")) {
      const parts = name.split(".");
      const processedValue = type === "checkbox" ? checked : value;
      setFormData({
        ...formData,
        homepage: {
          ...formData.homepage,
          [parts[1]]: {
            ...(formData.homepage && formData.homepage[parts[1]]),
            [parts[2]]: processedValue,
          },
        },
      });
      return;
    }

    // Handle nested fields (upi, bank, socialMedia, aboutUs, contactUsPage, comingSoon)
    if (
      name.startsWith("upi.") ||
      name.startsWith("bank.") ||
      name.startsWith("socialMedia.") ||
      name.startsWith("aboutUs.") ||
      name.startsWith("contactUsPage.") ||
      name.startsWith("comingSoon.")
    ) {
      const [parent, child] = name.split(".");
      // Convert IFSC code to uppercase
      let processedValue;
      if (name === "bank.ifscCode") {
        processedValue = value.toUpperCase();
      } else if (type === "checkbox") {
        processedValue = checked;
      } else {
        processedValue = value;
      }
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: processedValue,
        },
      });
    } else {
      // Handle regular fields and checkboxes
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  // Handle form submission
  const onSubmit = (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    setSubmitting(true);

    // Validation rules
    let validationRules = [
      {
        path: "name",
        msg: "Please provide a valid name.",
      },
      {
        path: "contactUs",
        msg: "Please provide contact information.",
      },
      {
        path: "email",
        msg: "Please provide a valid email address.",
      },
    ];

    const errors = validateForm(formData, validationRules);

    if (errors.length) {
      setErrors(errors);
      setSubmitting(false);
      return;
    }

    // Prepare submit data
    const submitData = new FormData();
    submitData.append("name", formData.name);
    submitData.append("abbreviation", formData.abbreviation);
    submitData.append("contactUs", formData.contactUs);
    submitData.append("email", formData.email);
    submitData.append("address", formData.address);

    // Append logo if selected
    if (formData.logo) {
      submitData.append("logo", formData.logo);
    }
    // Append hero brain image if selected
    if (formData.heroBrainImage) {
      submitData.append("heroBrainImage", formData.heroBrainImage);
    }
    submitData.append(
      "socialMedia",
      JSON.stringify({
        instagram: formData.socialMedia.instagram,
        facebook: formData.socialMedia.facebook,
        youtube: formData.socialMedia.youtube,
        zoomMeeting: formData.socialMedia.zoomMeeting,
      }),
    );
    submitData.append("donationEnabled", formData.donationEnabled);
    submitData.append("donationMessage", formData.donationMessage);
    submitData.append("marqueeEnabled", formData.marqueeEnabled);
    submitData.append("marqueeMessage", formData.marqueeMessage);
    submitData.append("marqueeType", formData.marqueeType);
    submitData.append("loginEnabled", formData.loginEnabled);
    submitData.append("registerEnabled", formData.registerEnabled);
    submitData.append(
      "upi",
      JSON.stringify({
        upiId: formData.upi.upiId,
        upiHolderName: formData.upi.upiHolderName,
      }),
    );
    submitData.append(
      "bank",
      JSON.stringify({
        bankName: formData.bank.bankName,
        accountNo: formData.bank.accountNo,
        accountHolderName: formData.bank.accountHolderName,
        ifscCode: formData.bank.ifscCode,
      }),
    );
    submitData.append(
      "aboutUs",
      JSON.stringify({
        title: formData.aboutUs.title || "",
        description: formData.aboutUs.description || "",
        mission: formData.aboutUs.mission || "",
        vision: formData.aboutUs.vision || "",
      }),
    );
    submitData.append(
      "contactUsPage",
      JSON.stringify({
        phone: formData.contactUsPage.phone || "",
        secondaryPhone: formData.contactUsPage.secondaryPhone || "",
        email: formData.contactUsPage.email || "",
        address: formData.contactUsPage.address || "",
      }),
    );
    submitData.append(
      "comingSoon",
      JSON.stringify({
        enabled: formData.comingSoon.enabled || false,
        title: formData.comingSoon.title || "",
        description: formData.comingSoon.description || "",
        initiatives: formData.comingSoon.initiatives || [],
      }),
    );
    submitData.append(
      "homepage",
      JSON.stringify({
        hero: formData.homepage?.hero || {},
        keyFeatures: formData.homepage?.keyFeatures || {},
        howItWorks: formData.homepage?.howItWorks || {},
      }),
    );

    // Store submit data and show confirmation modal
    setPendingSubmitData(submitData);
    setShowConfirmModal(true);
    setSubmitting(false);
  };

  // Handle confirmation from modal
  const handleConfirmSave = (txn_password) => {
    if (pendingSubmitData) {
      // Add transaction password to submit data
      if (pendingSubmitData instanceof FormData) {
        pendingSubmitData.append("txn_password", txn_password);
        updateCommonSettings(pendingSubmitData);
      } else {
        const submitDataWithPassword = {
          ...pendingSubmitData,
          txn_password,
        };
        updateCommonSettings(submitDataWithPassword);
      }
      setShowConfirmModal(false);
      setPendingSubmitData(null);
      setDisabled(true); // Switch back to view mode after save
    }
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setPendingSubmitData(null);
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    // Reset form data to original settings
    if (commonSettings && Object.keys(commonSettings).length > 0) {
      setFormData({
        name: commonSettings.name || "",
        abbreviation: commonSettings.abbreviation || "",
        contactUs: commonSettings.contactUs || "",
        email: commonSettings.email || "",
        address: commonSettings.address || "",
        logo: null,
        logoUrl: commonSettings.logoUrl || "",
        socialMedia: {
          instagram: commonSettings.socialMedia?.instagram || "",
          facebook: commonSettings.socialMedia?.facebook || "",
          youtube: commonSettings.socialMedia?.youtube || "",
          zoomMeeting: commonSettings.socialMedia?.zoomMeeting || "",
        },
        donationEnabled:
          commonSettings.donationEnabled !== undefined
            ? commonSettings.donationEnabled
            : true,
        donationMessage: commonSettings.donationMessage || "",
        marqueeEnabled:
          commonSettings.marqueeEnabled !== undefined
            ? commonSettings.marqueeEnabled
            : false,
        marqueeMessage: commonSettings.marqueeMessage || "",
        marqueeType: commonSettings.marqueeType || "warning",
        loginEnabled:
          commonSettings.loginEnabled !== undefined
            ? commonSettings.loginEnabled
            : true,
        registerEnabled:
          commonSettings.registerEnabled !== undefined
            ? commonSettings.registerEnabled
            : true,
        upi: {
          upiId: commonSettings.upi?.upiId || "",
          upiHolderName: commonSettings.upi?.upiHolderName || "",
        },
        bank: {
          bankName: commonSettings.bank?.bankName || "",
          accountNo: commonSettings.bank?.accountNo || "",
          accountHolderName: commonSettings.bank?.accountHolderName || "",
          ifscCode: commonSettings.bank?.ifscCode || "",
        },
        aboutUs: {
          title: commonSettings.aboutUs?.title || "",
          description: commonSettings.aboutUs?.description || "",
          mission: commonSettings.aboutUs?.mission || "",
          vision: commonSettings.aboutUs?.vision || "",
        },
        contactUsPage: {
          phone: commonSettings.contactUsPage?.phone || "",
          secondaryPhone: commonSettings.contactUsPage?.secondaryPhone || "",
          email: commonSettings.contactUsPage?.email || "",
          address: commonSettings.contactUsPage?.address || "",
        },
        comingSoon: {
          enabled:
            commonSettings.comingSoon?.enabled !== undefined
              ? commonSettings.comingSoon.enabled
              : false,
          title: commonSettings.comingSoon?.title || "",
          description: commonSettings.comingSoon?.description || "",
          initiatives: commonSettings.comingSoon?.initiatives || [],
        },
      });
      // Reset logo preview
      if (commonSettings.logoUrl) {
        setLogoPreview(commonSettings.logoUrl);
      } else {
        setLogoPreview(null);
      }
    }
    toggleEdit();
  };

  if (loadingCommonSettings) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Application Settings"
          crumbs={[{ name: "Application Settings" }]}
        />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Application Settings"
        crumbs={[{ name: "Application Settings" }]}
      />
      <MainCard className="card-body">
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          <Row className="row-gap-3">
            <Col xs={12} className="card-heading mb-3">
              <Col xs={8} className="card-header-title">
                Application Settings
              </Col>
              <Col>
                <Button
                  variant="link"
                  size="sm"
                  className="float-end"
                  onClick={toggleEdit}
                >
                  {isDisabled ? (
                    <span>
                      <MdEdit title="Click to Edit" size={20} />
                    </span>
                  ) : (
                    <span>
                      <FaRegEye title="View mode" size={20} />
                    </span>
                  )}
                </Button>
              </Col>
            </Col>

            {/* Section 1: General Information */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">General Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6} lg={4}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="name">
                          Full Name <span>*</span>
                        </Form.Label>
                        <Form.Control
                          className={errorList.name ? "invalid" : ""}
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={(e) => onChange(e)}
                          required
                          disabled={isDisabled}
                        />
                        <Errors current_key="name" key="name" />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="abbreviation">
                          Abbreviation (Short Name)
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="abbreviation"
                          name="abbreviation"
                          value={formData.abbreviation}
                          onChange={(e) => onChange(e)}
                          placeholder="e.g., Project Name"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="contactUs">
                          Contact Us <span>*</span>
                        </Form.Label>
                        <Form.Control
                          className={errorList.contactUs ? "invalid" : ""}
                          type="text"
                          id="contactUs"
                          name="contactUs"
                          value={formData.contactUs}
                          onChange={(e) => onChange(e)}
                          required
                          disabled={isDisabled}
                        />
                        <Errors current_key="contactUs" key="contactUs" />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="email">
                          Email <span>*</span>
                        </Form.Label>
                        <Form.Control
                          className={errorList.email ? "invalid" : ""}
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={(e) => onChange(e)}
                          required
                          disabled={isDisabled}
                        />
                        <Errors current_key="email" key="email" />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="address">Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter address"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="logo">Application Logo</Form.Label>
                        {logoPreview && (
                          <div className="mb-2">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              style={{
                                maxWidth: "200px",
                                maxHeight: "100px",
                                objectFit: "contain",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                padding: "4px",
                              }}
                            />
                          </div>
                        )}
                        <Form.Control
                          type="file"
                          id="logo"
                          name="logo"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={onLogoChange}
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          Upload logo (JPG, PNG, or WEBP, max 2MB)
                        </Form.Text>
                        <Errors current_key="logo" key="logo" />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 2: Social Media Links */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Social Media Links</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="socialMedia.instagram">
                          Instagram URL
                        </Form.Label>
                        <Form.Control
                          type="url"
                          id="socialMedia.instagram"
                          name="socialMedia.instagram"
                          value={formData.socialMedia.instagram}
                          onChange={(e) => onChange(e)}
                          placeholder="https://instagram.com/yourprofile"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="socialMedia.facebook">
                          Facebook URL
                        </Form.Label>
                        <Form.Control
                          type="url"
                          id="socialMedia.facebook"
                          name="socialMedia.facebook"
                          value={formData.socialMedia.facebook}
                          onChange={(e) => onChange(e)}
                          placeholder="https://facebook.com/yourprofile"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="socialMedia.youtube">
                          YouTube URL
                        </Form.Label>
                        <Form.Control
                          type="url"
                          id="socialMedia.youtube"
                          name="socialMedia.youtube"
                          value={formData.socialMedia.youtube}
                          onChange={(e) => onChange(e)}
                          placeholder="https://youtube.com/yourchannel"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="socialMedia.zoomMeeting">
                          Zoom Meeting URL
                        </Form.Label>
                        <Form.Control
                          type="url"
                          id="socialMedia.zoomMeeting"
                          name="socialMedia.zoomMeeting"
                          value={formData.socialMedia.zoomMeeting}
                          onChange={(e) => onChange(e)}
                          placeholder="https://zoom.us/j/meetingid"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 3: Donation Settings */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Donation Settings</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Check
                          type="switch"
                          id="donationEnabled"
                          name="donationEnabled"
                          label="Enable Donation"
                          checked={formData.donationEnabled}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="donationMessage">
                          Donation Message
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          id="donationMessage"
                          name="donationMessage"
                          value={formData.donationMessage}
                          onChange={(e) => onChange(e)}
                          placeholder="Optional donation message"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 4: Marquee Settings */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Marquee Settings</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Check
                          type="switch"
                          id="marqueeEnabled"
                          name="marqueeEnabled"
                          label="Show Marquee"
                          checked={formData.marqueeEnabled}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="marqueeType">
                          Marquee Type
                        </Form.Label>
                        <Form.Select
                          id="marqueeType"
                          name="marqueeType"
                          value={formData.marqueeType}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        >
                          <option value="danger">Danger</option>
                          <option value="success">Success</option>
                          <option value="warning">Warning</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="marqueeMessage">
                          Marquee Message
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          id="marqueeMessage"
                          name="marqueeMessage"
                          value={formData.marqueeMessage}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter marquee message to display on client dashboard"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 6: Authentication Settings */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Authentication Settings</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Check
                          type="switch"
                          id="loginEnabled"
                          name="loginEnabled"
                          label="Enable Login"
                          checked={formData.loginEnabled}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          When disabled, users will not be able to login
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Check
                          type="switch"
                          id="registerEnabled"
                          name="registerEnabled"
                          label="Enable Registration"
                          checked={formData.registerEnabled}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          When disabled, new user registration will be blocked
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 7: UPI Details */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">UPI Details</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="upi.upiId">UPI ID</Form.Label>
                        <Form.Control
                          type="text"
                          id="upi.upiId"
                          name="upi.upiId"
                          value={formData.upi.upiId}
                          onChange={(e) => onChange(e)}
                          placeholder="e.g., yourname@paytm"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="upi.upiHolderName">
                          UPI Holder Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="upi.upiHolderName"
                          name="upi.upiHolderName"
                          value={formData.upi.upiHolderName}
                          onChange={(e) => onChange(e)}
                          placeholder="Account holder name"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 10: Bank Details */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Bank Details</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="bank.bankName">
                          Bank Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.bankName"
                          name="bank.bankName"
                          value={formData.bank.bankName}
                          onChange={(e) => onChange(e)}
                          placeholder="Bank name"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="bank.accountNo">
                          Account Number
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.accountNo"
                          name="bank.accountNo"
                          value={formData.bank.accountNo}
                          onChange={(e) => onChange(e)}
                          placeholder="Account number"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="bank.accountHolderName">
                          Account Holder Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.accountHolderName"
                          name="bank.accountHolderName"
                          value={formData.bank.accountHolderName}
                          onChange={(e) => onChange(e)}
                          placeholder="Account holder name"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="bank.ifscCode">
                          IFSC Code
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="bank.ifscCode"
                          name="bank.ifscCode"
                          value={formData.bank.ifscCode}
                          onChange={(e) => onChange(e)}
                          placeholder="IFSC code"
                          className="text-uppercase-input"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 11: About Us Page Content */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">About Us Page Content</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="aboutUs.title">
                          About Us Title
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="aboutUs.title"
                          name="aboutUs.title"
                          value={formData.aboutUs.title}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter About Us page title"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="aboutUs.description">
                          Description
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={6}
                          id="aboutUs.description"
                          name="aboutUs.description"
                          value={formData.aboutUs.description}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter detailed description about your organization"
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          Supports multiple paragraphs. Use line breaks to
                          separate paragraphs.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="aboutUs.mission">
                          Mission
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={5}
                          id="aboutUs.mission"
                          name="aboutUs.mission"
                          value={formData.aboutUs.mission}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter your organization's mission"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="aboutUs.vision">Vision</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={5}
                          id="aboutUs.vision"
                          name="aboutUs.vision"
                          value={formData.aboutUs.vision}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter your organization's vision"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 12: Contact Us Page Content */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Contact Us Page Content</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="contactUsPage.phone">
                          Primary Phone
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="contactUsPage.phone"
                          name="contactUsPage.phone"
                          value={formData.contactUsPage.phone}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter primary phone number"
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          If left empty, will use the general contact number
                          above.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="contactUsPage.secondaryPhone">
                          Secondary Phone (Optional)
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="contactUsPage.secondaryPhone"
                          name="contactUsPage.secondaryPhone"
                          value={formData.contactUsPage.secondaryPhone}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter secondary phone number"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="contactUsPage.email">
                          Contact Email
                        </Form.Label>
                        <Form.Control
                          type="email"
                          id="contactUsPage.email"
                          name="contactUsPage.email"
                          value={formData.contactUsPage.email}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter contact email"
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          If left empty, will use the general email above.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="contactUsPage.address">
                          Contact Address
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          id="contactUsPage.address"
                          name="contactUsPage.address"
                          value={formData.contactUsPage.address}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter contact address"
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          If left empty, will use the general address above.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 13: Coming Soon Page Content */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Coming Soon Page</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={6}>
                      <Form.Group className="form-group">
                        <Form.Check
                          type="switch"
                          id="comingSoon.enabled"
                          name="comingSoon.enabled"
                          label="Show Coming Soon Page"
                          checked={formData.comingSoon.enabled}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          When enabled, the Coming Soon page will be accessible
                          publicly. When disabled, the page will not be
                          accessible.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={12}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="comingSoon.title">
                          Page Title
                        </Form.Label>
                        <Form.Control
                          type="text"
                          id="comingSoon.title"
                          name="comingSoon.title"
                          value={formData.comingSoon.title}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter Coming Soon page title"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="form-group">
                        <Form.Label htmlFor="comingSoon.description">
                          Description / Introduction
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          id="comingSoon.description"
                          name="comingSoon.description"
                          value={formData.comingSoon.description}
                          onChange={(e) => onChange(e)}
                          placeholder="Enter a brief description or introduction about upcoming initiatives"
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          This will appear at the top of the Coming Soon page.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Initiatives List */}
                  <Row>
                    <Col xs={12}>
                      <div className="mb-3">
                        <h6>Future Initiatives</h6>
                        <Form.Text className="text-muted d-block mb-3">
                          Add future initiatives that will be displayed on the
                          Coming Soon page.
                        </Form.Text>
                        {formData.comingSoon.initiatives &&
                        formData.comingSoon.initiatives.length > 0 ? (
                          <div className="initiatives-list">
                            {formData.comingSoon.initiatives.map(
                              (initiative, index) => (
                                <Card key={index} className="mb-3">
                                  <Card.Body>
                                    <Row>
                                      <Col xs={12} md={6}>
                                        <Form.Group className="form-group">
                                          <Form.Label>
                                            Initiative Title{" "}
                                            <span className="text-danger">
                                              *
                                            </span>
                                          </Form.Label>
                                          <Form.Control
                                            type="text"
                                            value={initiative.title || ""}
                                            onChange={(e) => {
                                              const newInitiatives = [
                                                ...formData.comingSoon
                                                  .initiatives,
                                              ];
                                              newInitiatives[index] = {
                                                ...newInitiatives[index],
                                                title: e.target.value,
                                              };
                                              setFormData({
                                                ...formData,
                                                comingSoon: {
                                                  ...formData.comingSoon,
                                                  initiatives: newInitiatives,
                                                },
                                              });
                                            }}
                                            placeholder="e.g., Election / Voting Portal"
                                            disabled={isDisabled}
                                            required
                                          />
                                        </Form.Group>
                                      </Col>
                                      <Col xs={12} md={5}>
                                        <Form.Group className="form-group">
                                          <Form.Label>
                                            Description (Optional)
                                          </Form.Label>
                                          <Form.Control
                                            as="textarea"
                                            rows={2}
                                            value={initiative.description || ""}
                                            onChange={(e) => {
                                              const newInitiatives = [
                                                ...formData.comingSoon
                                                  .initiatives,
                                              ];
                                              newInitiatives[index] = {
                                                ...newInitiatives[index],
                                                description: e.target.value,
                                              };
                                              setFormData({
                                                ...formData,
                                                comingSoon: {
                                                  ...formData.comingSoon,
                                                  initiatives: newInitiatives,
                                                },
                                              });
                                            }}
                                            placeholder="Brief description of this initiative"
                                            disabled={isDisabled}
                                          />
                                        </Form.Group>
                                      </Col>
                                      <Col
                                        xs={12}
                                        md={1}
                                        className="d-flex align-items-end"
                                      >
                                        <Button
                                          variant="danger"
                                          size="sm"
                                          onClick={() => {
                                            const newInitiatives =
                                              formData.comingSoon.initiatives.filter(
                                                (_, i) => i !== index,
                                              );
                                            setFormData({
                                              ...formData,
                                              comingSoon: {
                                                ...formData.comingSoon,
                                                initiatives: newInitiatives,
                                              },
                                            });
                                          }}
                                          disabled={isDisabled}
                                          title="Remove Initiative"
                                        >
                                          ×
                                        </Button>
                                      </Col>
                                    </Row>
                                  </Card.Body>
                                </Card>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="text-muted mb-3">
                            No initiatives added yet. Click "Add Initiative" to
                            add one.
                          </div>
                        )}
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            const newInitiatives = [
                              ...formData.comingSoon.initiatives,
                              {
                                title: "",
                                description: "",
                                order: formData.comingSoon.initiatives.length,
                              },
                            ];
                            setFormData({
                              ...formData,
                              comingSoon: {
                                ...formData.comingSoon,
                                initiatives: newInitiatives,
                              },
                            });
                          }}
                          disabled={isDisabled}
                        >
                          + Add Initiative
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Section 14: Homepage (SBI Pro) */}
            <Col xs={12}>
              <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Homepage (SBI Pro – Smart Brain Intelligence)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12}>
                      <h6 className="text-muted mb-3">Hero Section</h6>
                    </Col>
                    <Col xs={12} md={4} lg={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Hero Brain Image</Form.Label>
                        <div className="mb-2">
                          {heroBrainPreview ? (
                            // eslint-disable-next-line jsx-a11y/img-redundant-alt
                            <img
                              src={heroBrainPreview}
                              alt="Hero brain image preview"
                              className="img-fluid rounded border"
                            />
                          ) : (
                            <div className="text-muted small">
                              No hero image uploaded yet.
                            </div>
                          )}
                        </div>
                        <Form.Control
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={onHeroBrainChange}
                          disabled={isDisabled}
                        />
                        <Form.Text className="text-muted">
                          Recommended: transparent PNG/WebP, square aspect ratio, max 2MB.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={8} lg={9}>
                      <Form.Group className="mb-3">
                        <Form.Label>Hero Title</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.hero.title"
                          value={formData.homepage?.hero?.title || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="Unlock Your Brain's Full Potential"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Hero Subheading</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.hero.subheading"
                          value={formData.homepage?.hero?.subheading || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="Advanced Intelligence Analysis..."
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Primary CTA Text</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.hero.ctaPrimaryText"
                          value={formData.homepage?.hero?.ctaPrimaryText || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="Get Started"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Primary CTA Link</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.hero.ctaPrimaryLink"
                          value={formData.homepage?.hero?.ctaPrimaryLink || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="/login"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Secondary CTA Text</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.hero.ctaSecondaryText"
                          value={formData.homepage?.hero?.ctaSecondaryText || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="Learn More"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Secondary CTA Link</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.hero.ctaSecondaryLink"
                          value={formData.homepage?.hero?.ctaSecondaryLink || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="/about-us"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="homepage.hero.showBannerSlider"
                          name="homepage.hero.showBannerSlider"
                          label="Also show banner slider below hero"
                          checked={formData.homepage?.hero?.showBannerSlider || false}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <hr />
                  <Row>
                    <Col xs={12}>
                      <h6 className="text-muted mb-3">Our Key Features</h6>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="homepage.keyFeatures.enabled"
                          name="homepage.keyFeatures.enabled"
                          label="Show Key Features section"
                          checked={formData.homepage?.keyFeatures?.enabled !== false}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Section Title</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.keyFeatures.title"
                          value={formData.homepage?.keyFeatures?.title || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="Our Key Features"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Section Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="homepage.keyFeatures.description"
                          value={formData.homepage?.keyFeatures?.description || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="Explore the advanced tools and insights..."
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <div className="mb-2">Feature items (optional)</div>
                      {(formData.homepage?.keyFeatures?.items || []).map((item, index) => (
                        <Card key={index} className="mb-2">
                          <Card.Body className="py-2">
                            <Row>
                              <Col md={5}>
                                <Form.Control
                                  size="sm"
                                  placeholder="Feature title"
                                  value={item.title || ""}
                                  onChange={(e) => {
                                    const items = [...(formData.homepage.keyFeatures.items || [])];
                                    items[index] = { ...items[index], title: e.target.value };
                                    setFormData({
                                      ...formData,
                                      homepage: {
                                        ...formData.homepage,
                                        keyFeatures: { ...formData.homepage.keyFeatures, items },
                                      },
                                    });
                                  }}
                                  disabled={isDisabled}
                                />
                              </Col>
                              <Col md={5}>
                                <Form.Control
                                  size="sm"
                                  placeholder="Description"
                                  value={item.description || ""}
                                  onChange={(e) => {
                                    const items = [...(formData.homepage.keyFeatures.items || [])];
                                    items[index] = { ...items[index], description: e.target.value };
                                    setFormData({
                                      ...formData,
                                      homepage: {
                                        ...formData.homepage,
                                        keyFeatures: { ...formData.homepage.keyFeatures, items },
                                      },
                                    });
                                  }}
                                  disabled={isDisabled}
                                />
                              </Col>
                              <Col md={2}>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => {
                                    const items = (formData.homepage.keyFeatures.items || []).filter((_, i) => i !== index);
                                    setFormData({
                                      ...formData,
                                      homepage: {
                                        ...formData.homepage,
                                        keyFeatures: { ...formData.homepage.keyFeatures, items },
                                      },
                                    });
                                  }}
                                  disabled={isDisabled}
                                >
                                  Remove
                                </Button>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      ))}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          const items = [...(formData.homepage?.keyFeatures?.items || []), { title: "", description: "", order: (formData.homepage?.keyFeatures?.items || []).length }];
                          setFormData({
                            ...formData,
                            homepage: {
                              ...formData.homepage,
                              keyFeatures: { ...formData.homepage.keyFeatures, items },
                            },
                          });
                        }}
                        disabled={isDisabled}
                      >
                        + Add feature item
                      </Button>
                    </Col>
                  </Row>
                  <hr />
                  <Row>
                    <Col xs={12}>
                      <h6 className="text-muted mb-3">How SBI Pro Analysis Works</h6>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="homepage.howItWorks.enabled"
                          name="homepage.howItWorks.enabled"
                          label="Show How It Works section"
                          checked={formData.homepage?.howItWorks?.enabled !== false}
                          onChange={(e) => onChange(e)}
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tag</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.howItWorks.tag"
                          value={formData.homepage?.howItWorks?.tag || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="SBI PRO ANALYSIS"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Section Title</Form.Label>
                        <Form.Control
                          type="text"
                          name="homepage.howItWorks.title"
                          value={formData.homepage?.howItWorks?.title || ""}
                          onChange={(e) => onChange(e)}
                          placeholder="How SBI Pro Analysis Works"
                          disabled={isDisabled}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <div className="mb-2">Steps (order preserved)</div>
                      {(formData.homepage?.howItWorks?.steps || []).map((step, index) => (
                        <Card key={index} className="mb-2">
                          <Card.Body className="py-2">
                            <Row>
                              <Col md={5}>
                                <Form.Control
                                  size="sm"
                                  placeholder="Step title"
                                  value={step.title || ""}
                                  onChange={(e) => {
                                    const steps = [...(formData.homepage.howItWorks.steps || [])];
                                    steps[index] = { ...steps[index], title: e.target.value };
                                    setFormData({
                                      ...formData,
                                      homepage: {
                                        ...formData.homepage,
                                        howItWorks: { ...formData.homepage.howItWorks, steps },
                                      },
                                    });
                                  }}
                                  disabled={isDisabled}
                                />
                              </Col>
                              <Col md={5}>
                                <Form.Control
                                  size="sm"
                                  placeholder="Step description"
                                  value={step.description || ""}
                                  onChange={(e) => {
                                    const steps = [...(formData.homepage.howItWorks.steps || [])];
                                    steps[index] = { ...steps[index], description: e.target.value };
                                    setFormData({
                                      ...formData,
                                      homepage: {
                                        ...formData.homepage,
                                        howItWorks: { ...formData.homepage.howItWorks, steps },
                                      },
                                    });
                                  }}
                                  disabled={isDisabled}
                                />
                              </Col>
                              <Col md={2}>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => {
                                    const steps = (formData.homepage.howItWorks.steps || []).filter((_, i) => i !== index);
                                    setFormData({
                                      ...formData,
                                      homepage: {
                                        ...formData.homepage,
                                        howItWorks: { ...formData.homepage.howItWorks, steps },
                                      },
                                    });
                                  }}
                                  disabled={isDisabled}
                                >
                                  Remove
                                </Button>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      ))}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const steps = [...(formData.homepage?.howItWorks?.steps || []), { title: "", description: "", order: (formData.homepage?.howItWorks?.steps || []).length }];
                          setFormData({
                            ...formData,
                            homepage: {
                              ...formData.homepage,
                              howItWorks: { ...formData.homepage.howItWorks, steps },
                            },
                          });
                        }}
                        disabled={isDisabled}
                      >
                        + Add step
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Submit Button */}
            <Col xs={12} className="text-end">
              <Button
                className="m-2"
                type="submit"
                variant="primary"
                disabled={submitting || loadingOnSubmit || isDisabled}
              >
                {submitting || loadingOnSubmit ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    ></span>
                    {` Saving... `}
                  </>
                ) : (
                  <>Save Changes</>
                )}
              </Button>
              <Button
                className="ml-2"
                type="button"
                variant="danger"
                onClick={onClickCancel}
                disabled={submitting || loadingOnSubmit || isDisabled}
              >
                Cancel
              </Button>
            </Col>
          </Row>
        </Form>
      </MainCard>

      {/* Verification Confirm Modal */}
      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={handleCloseModal}
        handleConfirm={handleConfirmSave}
        title="Confirm Settings Update"
        body="Please enter your transaction password to confirm the settings update."
        submitBtnText="Confirm & Save"
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  adminCommonSettings: state.adminCommonSettings,
});

export default connect(mapStateToProps, {
  setErrors,
  resetComponentStore,
  getCommonSettings,
  updateCommonSettings,
})(ApplicationSettings);
