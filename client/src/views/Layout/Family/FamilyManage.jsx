import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  Row,
  Col,
  Form,
  Button,
  Alert,
} from "react-bootstrap";

import {
  getFamilyFlat,
  getFamilyTree,
  initFamily,
  createFamilyMemberAction,
  updateFamilyMemberAction,
  createFamilyMarriageAction,
  addChildToMarriageAction,
  updateChildOrderAction,
  updateMarriageAction,
  deleteFamilyMemberAction,
} from "@src/actions/familyActions";
import { familyService } from "@src/services/familyService";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import {
  ROOT_INIT_DESCRIPTION,
  FAMILY_LOADER_MESSAGES,
} from "@src/constants/familyConstants";
import FamilyMemberList from "./components/FamilyMemberList";
import FamilyMarriagesSection from "./components/FamilyMarriagesSection";
import FamilyMemberEditModal from "./components/FamilyMemberEditModal";
import FamilyMemberDeleteModal from "./components/FamilyMemberDeleteModal";
import MarriageDivorceModal from "./components/MarriageDivorceModal";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/** Single source for member display name (firstName + lastName or "Unnamed"). */
const getMemberDisplayName = (m) =>
  (m
    ? `${(m.firstName || "").trim()} ${(m.lastName || "").trim()}`.trim()
    : "") || "Unnamed";

const INITIAL_MEMBER_FORM = {
  firstName: "",
  lastName: "",
  gender: "male",
  isAlive: true,
  dateOfDeath: "",
};
const INITIAL_MARRIAGE_FORM = {
  spouse1Id: "",
  spouse2Mode: "existing",
  spouse2Id: "",
  spouse2FirstName: "",
  spouse2LastName: "",
  spouse2Gender: "female",
};
const INITIAL_CHILD_FORM = {
  marriageId: "",
  childMode: "new",
  childId: "",
  childFirstName: "",
  childLastName: "",
  childGender: "male",
  childDob: "",
  childOrder: "",
};

const FamilyManage = ({
  familyState,
  getFamilyFlat,
  getFamilyTree,
  initFamily,
  createFamilyMemberAction,
  updateFamilyMemberAction,
  createFamilyMarriageAction,
  addChildToMarriageAction,
  updateChildOrderAction,
  updateMarriageAction,
  deleteFamilyMemberAction,
}) => {
  const navigate = useNavigate();
  const {
    family,
    members,
    marriages,
    totalMembers,
    loading,
    loadingTree,
    error,
  } = familyState;

  const initialMemberListParams = { page: DEFAULT_PAGE, limit: DEFAULT_LIMIT };
  const [memberListParams, setMemberListParams] = useState(
    initialMemberListParams
  );

  const [rootMale, setRootMale] = useState({ firstName: "", lastName: "" });
  const [rootFemale, setRootFemale] = useState({ firstName: "", lastName: "" });

  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER_FORM);
  const [marriageForm, setMarriageForm] = useState(INITIAL_MARRIAGE_FORM);
  const [eligibleSpouseIds, setEligibleSpouseIds] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [eligibleChildIds, setEligibleChildIds] = useState([]);
  const [loadingEligibleChildren, setLoadingEligibleChildren] = useState(false);

  const [childForm, setChildForm] = useState(INITIAL_CHILD_FORM);

  const [editMember, setEditMember] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteMember, setDeleteMember] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [divorceMarriage, setDivorceMarriage] = useState(null);
  const [showDivorce, setShowDivorce] = useState(false);

  useEffect(() => {
    getFamilyFlat(memberListParams);
  }, [getFamilyFlat, memberListParams]);

  useEffect(() => {
    if (!marriageForm.spouse1Id) {
      setEligibleSpouseIds([]);
      return;
    }
    let cancelled = false;
    setLoadingEligible(true);
    familyService
      .getEligibleSpouses(marriageForm.spouse1Id)
      .then((data) => {
        if (cancelled || !data?.response?.eligible) return;
        setEligibleSpouseIds(data.response.eligible.map((id) => String(id)));
      })
      .catch(() => {
        if (!cancelled) setEligibleSpouseIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marriageForm.spouse1Id]);

  useEffect(() => {
    if (
      marriageForm.spouse2Id &&
      !loadingEligible &&
      eligibleSpouseIds.length > 0 &&
      !eligibleSpouseIds.includes(String(marriageForm.spouse2Id))
    ) {
      setMarriageForm((p) => ({ ...p, spouse2Id: "" }));
    }
  }, [eligibleSpouseIds, loadingEligible, marriageForm.spouse2Id]);

  useEffect(() => {
    if (!childForm.marriageId) {
      setEligibleChildIds([]);
      return;
    }
    let cancelled = false;
    setLoadingEligibleChildren(true);
    familyService
      .getEligibleChildren(childForm.marriageId)
      .then((data) => {
        if (cancelled || !data?.response?.eligible) return;
        setEligibleChildIds(data.response.eligible.map((id) => String(id)));
      })
      .catch(() => {
        if (!cancelled) setEligibleChildIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEligibleChildren(false);
      });
    return () => {
      cancelled = true;
    };
  }, [childForm.marriageId]);

  useEffect(() => {
    if (
      childForm.childId &&
      !loadingEligibleChildren &&
      eligibleChildIds.length > 0 &&
      !eligibleChildIds.includes(String(childForm.childId))
    ) {
      setChildForm((p) => ({ ...p, childId: "" }));
    }
  }, [eligibleChildIds, loadingEligibleChildren, childForm.childId]);

  const familyInitialized = !!(family?.rootMemberId || family?.rootMarriageId);

  /** Single place to refresh the members list. Use after any mutation that affects the list. */
  const refreshMembers = useCallback(() => {
    getFamilyFlat(memberListParams);
  }, [getFamilyFlat, memberListParams]);

  const memberOptions = useMemo(
    () =>
      (members || []).map((m) => ({
        value: m._id,
        label: getMemberDisplayName(m),
      })),
    [members]
  );

  const aliveMemberOptions = useMemo(() => {
    return (members || [])
      .filter((m) => m.isAlive !== false)
      .map((m) => ({
        value: m._id,
        label: getMemberDisplayName(m),
      }));
  }, [members]);

  const marriageOptions = useMemo(() => {
    const byId = new Map((members || []).map((m) => [m._id, m]));
    return (marriages || []).map((mar) => {
      const s1 = byId.get(mar.spouse1Id);
      const s2 = byId.get(mar.spouse2Id);
      const label = [
        getMemberDisplayName(s1 || { firstName: "Spouse 1" }),
        getMemberDisplayName(s2 || { firstName: "Spouse 2" }),
      ].join(" + ");
      return { value: mar._id, label };
    });
  }, [marriages, members]);

  const activeMarriageOptions = useMemo(() => {
    const active = (mar) => (mar.status || "active") === "active";
    return (marriageOptions || []).filter((o) => {
      const mar = (marriages || []).find(
        (m) => String(m._id) === String(o.value)
      );
      return mar && active(mar);
    });
  }, [marriageOptions, marriages]);

  const membersById = useMemo(
    () => new Map((members || []).map((m) => [String(m._id), m])),
    [members]
  );

  const sameGenderMarriage = useMemo(() => {
    if (!marriageForm.spouse1Id) return false;
    const g1 = (
      membersById.get(String(marriageForm.spouse1Id))?.gender || ""
    ).toLowerCase();
    if (marriageForm.spouse2Mode === "existing") {
      if (!marriageForm.spouse2Id) return false;
      const g2 = (
        membersById.get(String(marriageForm.spouse2Id))?.gender || ""
      ).toLowerCase();
      return !!g1 && !!g2 && g1 === g2;
    }
    const g2 = (marriageForm.spouse2Gender || "").toLowerCase();
    return !!g1 && !!g2 && g1 === g2;
  }, [
    marriageForm.spouse1Id,
    marriageForm.spouse2Mode,
    marriageForm.spouse2Id,
    marriageForm.spouse2Gender,
    membersById,
  ]);

  const submitInit = async (e) => {
    e.preventDefault();
    const result = await initFamily({
      rootMale: rootMale.firstName ? rootMale : undefined,
      rootFemale: rootFemale.firstName ? rootFemale : undefined,
    });
    if (result) {
      setMemberListParams((p) => ({ ...p, page: DEFAULT_PAGE }));
    }
  };

  const submitMember = async (e) => {
    e.preventDefault();
    const payload = {
      firstName: memberForm.firstName,
      lastName: memberForm.lastName,
      gender: memberForm.gender,
      isAlive: memberForm.isAlive,
      dateOfDeath:
        memberForm.isAlive === false && memberForm.dateOfDeath
          ? memberForm.dateOfDeath
          : undefined,
    };
    const result = await createFamilyMemberAction(payload);
    if (result) {
      setMemberForm(INITIAL_MEMBER_FORM);
      refreshMembers();
      getFamilyTree();
    }
  };

  const submitMarriage = async (e) => {
    e.preventDefault();
    if (!marriageForm.spouse1Id) return;

    const payload =
      marriageForm.spouse2Mode === "existing"
        ? {
            spouse1Id: marriageForm.spouse1Id,
            spouse2Id: marriageForm.spouse2Id,
          }
        : {
            spouse1Id: marriageForm.spouse1Id,
            spouse2: {
              firstName: marriageForm.spouse2FirstName,
              lastName: marriageForm.spouse2LastName,
              gender: marriageForm.spouse2Gender,
            },
          };

    const result = await createFamilyMarriageAction(payload);
    if (result && result.validationError) {
      setMarriageForm((p) => ({
        ...p,
        spouse2Id: "",
        spouse2FirstName: "",
        spouse2LastName: "",
      }));
      setLoadingEligible(true);
      familyService
        .getEligibleSpouses(marriageForm.spouse1Id)
        .then((data) => {
          if (data?.response?.eligible)
            setEligibleSpouseIds(
              data.response.eligible.map((id) => String(id))
            );
        })
        .finally(() => setLoadingEligible(false));
      return;
    }
    if (result) {
      setMarriageForm((p) => ({
        ...p,
        ...INITIAL_MARRIAGE_FORM,
        spouse1Id: p.spouse1Id,
        spouse2Mode: p.spouse2Mode,
      }));
      refreshMembers();
    }
  };

  const submitChild = async (e) => {
    e.preventDefault();
    if (!childForm.marriageId) return;

    const orderNum = childForm.childOrder.trim()
      ? parseInt(childForm.childOrder, 10)
      : undefined;
    const payload =
      childForm.childMode === "existing"
        ? { childId: childForm.childId, order: orderNum }
        : {
            child: {
              firstName: childForm.childFirstName,
              lastName: childForm.childLastName,
              gender: childForm.childGender,
              ...(childForm.childDob ? { dob: childForm.childDob } : {}),
            },
            order: orderNum,
          };

    const result = await addChildToMarriageAction(
      childForm.marriageId,
      payload
    );
    if (result && result.validationError) {
      setChildForm((p) => ({ ...p, childId: "" }));
      setLoadingEligibleChildren(true);
      familyService
        .getEligibleChildren(childForm.marriageId)
        .then((data) => {
          if (data?.response?.eligible)
            setEligibleChildIds(data.response.eligible.map((id) => String(id)));
        })
        .finally(() => setLoadingEligibleChildren(false));
      return;
    }
    if (result) {
      setChildForm((p) => ({
        ...INITIAL_CHILD_FORM,
        marriageId: p.marriageId,
        childMode: p.childMode,
      }));
      refreshMembers();
      getFamilyTree();
    }
  };

  const openEdit = (m) => {
    setEditMember(m);
    setShowEdit(true);
  };

  const handleDeleteClick = (m) => {
    if (!m?._id) return;
    setDeleteMember(m);
    setShowDelete(true);
  };

  const handleDeleteConfirm = async (memberId, mode) => {
    await deleteFamilyMemberAction(memberId, { mode });
    setShowDelete(false);
    setDeleteMember(null);
    refreshMembers();
    getFamilyTree(); // Invalidate/refresh tree so View Family Tree and list stay in sync
  };

  const handleDivorceConfirm = async () => {
    if (!divorceMarriage?._id) return;
    await updateMarriageAction(divorceMarriage._id, { status: "divorced" });
    setShowDivorce(false);
    setDivorceMarriage(null);
    refreshMembers();
    getFamilyTree(); // Invalidate/refresh tree after mutation
  };

  return (
    <Container className="card-profile-container">
      <AppBreadCrumb
        title="Family"
        breadcrumbs={[
          { label: "Dashboard", link: "/user/dashboard" },
          { label: "Family" },
        ]}
      />

      <MainCard>
        <div className="d-flex justify-content-end mb-3">
          <Button
            variant="outline-primary"
            onClick={() => navigate("/user/family-tree")}
          >
            View Family Tree
          </Button>
        </div>

        {!!error && (
          <Alert variant="danger" className="shadow-sm">
            {String(error)}
          </Alert>
        )}

        {!familyInitialized ? (
          /* Root initialization: single starting point; user can start from any generation. */
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <h5 className="mb-3">Initialize Root</h5>
              <Alert variant="info" className="mb-3">
                {ROOT_INIT_DESCRIPTION}
              </Alert>
              {loading ? (
                <BouncingLoader
                  minHeight="400px"
                  message={FAMILY_LOADER_MESSAGES.INITIALIZING}
                />
              ) : (
                <Form onSubmit={submitInit}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Card className="h-100">
                        <Card.Body>
                          <h6 className="mb-3">Root Male</h6>
                          <Row className="g-2">
                            <Col md={6}>
                              <Form.Control
                                placeholder="First name"
                                value={rootMale.firstName}
                                onChange={(e) =>
                                  setRootMale((p) => ({
                                    ...p,
                                    firstName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                            <Col md={6}>
                              <Form.Control
                                placeholder="Last name"
                                value={rootMale.lastName}
                                onChange={(e) =>
                                  setRootMale((p) => ({
                                    ...p,
                                    lastName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                          </Row>
                          <div className="text-muted small mt-2">
                            Gender is set to Male
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="h-100">
                        <Card.Body>
                          <h6 className="mb-3">Root Female</h6>
                          <Row className="g-2">
                            <Col md={6}>
                              <Form.Control
                                placeholder="First name"
                                value={rootFemale.firstName}
                                onChange={(e) =>
                                  setRootFemale((p) => ({
                                    ...p,
                                    firstName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                            <Col md={6}>
                              <Form.Control
                                placeholder="Last name"
                                value={rootFemale.lastName}
                                onChange={(e) =>
                                  setRootFemale((p) => ({
                                    ...p,
                                    lastName: e.target.value,
                                  }))
                                }
                              />
                            </Col>
                          </Row>
                          <div className="text-muted small mt-2">
                            Gender is set to Female
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={12} className="d-flex justify-content-end">
                      <Button type="submit" disabled={loading}>
                        Initialize Family
                      </Button>
                    </Col>
                  </Row>
                </Form>
              )}
            </Card.Body>
          </Card>
        ) : (
          <>
            {/* Show bouncing loader during any mutation (add member, marriage, child, etc.) */}
            {loading && (
              <div className="mb-3">
                <BouncingLoader
                  minHeight="120px"
                  className="rounded shadow-sm"
                  message={FAMILY_LOADER_MESSAGES.LOADING}
                />
              </div>
            )}
            {/* Actions: Add Member / Create Marriage / Add Child */}
            <div className="mb-3">
              <h5 className="mb-2 text-muted small text-uppercase">Actions</h5>
            </div>
            <Card className="shadow-sm mb-3">
              <Card.Body>
                <h5 className="mb-3">Add Member</h5>
                <Form onSubmit={submitMember}>
                  <Row className="g-3 align-items-end">
                    <Col md={4}>
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        value={memberForm.firstName}
                        onChange={(e) =>
                          setMemberForm((p) => ({
                            ...p,
                            firstName: e.target.value,
                          }))
                        }
                        required
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        value={memberForm.lastName}
                        onChange={(e) =>
                          setMemberForm((p) => ({
                            ...p,
                            lastName: e.target.value,
                          }))
                        }
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label>Gender</Form.Label>
                      <Form.Select
                        value={memberForm.gender}
                        onChange={(e) =>
                          setMemberForm((p) => ({
                            ...p,
                            gender: e.target.value,
                          }))
                        }
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Form.Label>Alive</Form.Label>
                      <Form.Check
                        type="switch"
                        id="member-isAlive"
                        label={memberForm.isAlive ? "Alive" : "Deceased"}
                        checked={!!memberForm.isAlive}
                        onChange={(e) =>
                          setMemberForm((p) => ({
                            ...p,
                            isAlive: e.target.checked,
                          }))
                        }
                      />
                    </Col>
                    {memberForm.isAlive === false && (
                      <Col md={2}>
                        <Form.Label>Date of Death</Form.Label>
                        <Form.Control
                          type="date"
                          value={memberForm.dateOfDeath}
                          onChange={(e) =>
                            setMemberForm((p) => ({
                              ...p,
                              dateOfDeath: e.target.value,
                            }))
                          }
                        />
                      </Col>
                    )}
                    <Col md={2}>
                      <Button
                        type="submit"
                        className="w-100"
                        disabled={loading}
                      >
                        Add
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>

            <Card className="shadow-sm mb-3">
              <Card.Body>
                <h5 className="mb-3">Create Marriage (Spouse Mapping)</h5>
                <Form onSubmit={submitMarriage}>
                  <Row className="g-3 align-items-end">
                    <Col md={4}>
                      <Form.Label>Spouse 1 (Existing Member)</Form.Label>
                      <Form.Select
                        value={marriageForm.spouse1Id}
                        onChange={(e) =>
                          setMarriageForm((p) => ({
                            ...p,
                            spouse1Id: e.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Select member</option>
                        {aliveMemberOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted small">
                        Only alive members can marry.
                      </Form.Text>
                    </Col>
                    <Col md={3}>
                      <Form.Label>Spouse 2 Mode</Form.Label>
                      <Form.Select
                        value={marriageForm.spouse2Mode}
                        onChange={(e) =>
                          setMarriageForm((p) => ({
                            ...p,
                            spouse2Mode: e.target.value,
                          }))
                        }
                      >
                        <option value="existing">Existing</option>
                        <option value="new">New</option>
                      </Form.Select>
                    </Col>
                    {marriageForm.spouse2Mode === "existing" ? (
                      <Col md={3}>
                        <Form.Label>Spouse 2 (Existing Member)</Form.Label>
                        <Form.Select
                          value={marriageForm.spouse2Id}
                          onChange={(e) =>
                            setMarriageForm((p) => ({
                              ...p,
                              spouse2Id: e.target.value,
                            }))
                          }
                          required
                          disabled={loadingEligible}
                        >
                          <option value="">
                            {loadingEligible ? "Loading…" : "Select member"}
                          </option>
                          {!loadingEligible &&
                            aliveMemberOptions
                              .filter((o) =>
                                eligibleSpouseIds.includes(String(o.value))
                              )
                              .map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                        </Form.Select>
                      </Col>
                    ) : (
                      <>
                        <Col md={2}>
                          <Form.Label>First Name</Form.Label>
                          <Form.Control
                            value={marriageForm.spouse2FirstName}
                            onChange={(e) =>
                              setMarriageForm((p) => ({
                                ...p,
                                spouse2FirstName: e.target.value,
                              }))
                            }
                            required
                          />
                        </Col>
                        <Col md={2}>
                          <Form.Label>Gender</Form.Label>
                          <Form.Select
                            value={marriageForm.spouse2Gender}
                            onChange={(e) =>
                              setMarriageForm((p) => ({
                                ...p,
                                spouse2Gender: e.target.value,
                              }))
                            }
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                          </Form.Select>
                        </Col>
                      </>
                    )}
                    <Col md={2}>
                      <Button
                        type="submit"
                        className="w-100"
                        disabled={loading || sameGenderMarriage}
                      >
                        Create
                      </Button>
                    </Col>
                  </Row>
                  {sameGenderMarriage && (
                    <Form.Text className="text-danger d-block mt-2">
                      Same-gender marriage is not allowed.
                    </Form.Text>
                  )}
                </Form>
              </Card.Body>
            </Card>

            <Card className="shadow-sm mb-3">
              <Card.Body>
                <h5 className="mb-3">Add Child to Marriage</h5>
                <Form onSubmit={submitChild}>
                  <Row className="g-3 align-items-end">
                    <Col md={5}>
                      <Form.Label>Marriage</Form.Label>
                      <Form.Select
                        value={childForm.marriageId}
                        onChange={(e) =>
                          setChildForm((p) => ({
                            ...p,
                            marriageId: e.target.value,
                            childId: "",
                          }))
                        }
                        required
                      >
                        <option value="">Select marriage</option>
                        {activeMarriageOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted small">
                        Only active marriages can have children added.
                      </Form.Text>
                    </Col>
                    <Col md={3}>
                      <Form.Label>Child Mode</Form.Label>
                      <Form.Select
                        value={childForm.childMode}
                        onChange={(e) =>
                          setChildForm((p) => ({
                            ...p,
                            childMode: e.target.value,
                          }))
                        }
                      >
                        <option value="new">New</option>
                        <option value="existing">Existing</option>
                      </Form.Select>
                    </Col>
                    {childForm.childMode === "existing" ? (
                      <Col md={2}>
                        <Form.Label>Child (Existing)</Form.Label>
                        <Form.Select
                          value={childForm.childId}
                          onChange={(e) =>
                            setChildForm((p) => ({
                              ...p,
                              childId: e.target.value,
                            }))
                          }
                          required
                          disabled={loadingEligibleChildren}
                        >
                          <option value="">
                            {loadingEligibleChildren
                              ? "Loading…"
                              : "Select member"}
                          </option>
                          {!loadingEligibleChildren &&
                            memberOptions
                              .filter((o) =>
                                eligibleChildIds.includes(String(o.value))
                              )
                              .map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                        </Form.Select>
                      </Col>
                    ) : (
                      <>
                        <Col md={2}>
                          <Form.Label>First Name</Form.Label>
                          <Form.Control
                            value={childForm.childFirstName}
                            onChange={(e) =>
                              setChildForm((p) => ({
                                ...p,
                                childFirstName: e.target.value,
                              }))
                            }
                            required
                          />
                        </Col>
                        <Col md={2}>
                          <Form.Label>Gender</Form.Label>
                          <Form.Select
                            value={childForm.childGender}
                            onChange={(e) =>
                              setChildForm((p) => ({
                                ...p,
                                childGender: e.target.value,
                              }))
                            }
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </Form.Select>
                        </Col>
                      </>
                    )}
                    <Col md={2}>
                      <Form.Label className="text-nowrap">
                        DOB (optional)
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={childForm.childDob}
                        onChange={(e) =>
                          setChildForm((p) => ({
                            ...p,
                            childDob: e.target.value,
                          }))
                        }
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label className="text-nowrap">
                        Order (optional)
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        placeholder="1 = sabse bada, 2 = doosra, 3 = teesra..."
                        value={childForm.childOrder}
                        onChange={(e) =>
                          setChildForm((p) => ({
                            ...p,
                            childOrder: e.target.value,
                          }))
                        }
                      />
                    </Col>
                    <Col md={2}>
                      <Button
                        type="submit"
                        className="w-100"
                        disabled={loading}
                      >
                        Add
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>

            <FamilyMarriagesSection
              marriages={marriages}
              membersById={membersById}
              loading={loading}
              onDivorce={(mar) => {
                setDivorceMarriage(mar);
                setShowDivorce(true);
              }}
            />

            <div className="mt-4">
              <FamilyMemberList
                data={members}
                count={totalMembers ?? 0}
                params={memberListParams}
                setParams={setMemberListParams}
                progressPending={loading}
                onEdit={openEdit}
                onDelete={handleDeleteClick}
              />
            </div>

            <FamilyMemberEditModal
              show={showEdit}
              onHide={() => setShowEdit(false)}
              member={editMember}
              marriages={marriages}
              members={members}
              onSave={async (
                memberId,
                { memberPayload, orderContext, isMemberChanged, isOrderChanged }
              ) => {
                if (isMemberChanged) {
                  await updateFamilyMemberAction(memberId, memberPayload);
                }
                if (isOrderChanged && orderContext) {
                  await updateChildOrderAction(
                    orderContext.marriageId,
                    memberId,
                    { order: orderContext.order }
                  );
                }
                if (isOrderChanged) {
                  getFamilyTree();
                } else if (isMemberChanged) {
                  refreshMembers();
                }
              }}
            />

            <FamilyMemberDeleteModal
              show={showDelete}
              onHide={() => {
                setShowDelete(false);
                setDeleteMember(null);
              }}
              member={deleteMember}
              onConfirm={handleDeleteConfirm}
              loading={loading}
            />

            <MarriageDivorceModal
              show={showDivorce}
              onHide={() => {
                setShowDivorce(false);
                setDivorceMarriage(null);
              }}
              marriageDisplayName={
                divorceMarriage
                  ? (() => {
                      const s1 = membersById.get(
                        String(divorceMarriage.spouse1Id)
                      );
                      const s2 = membersById.get(
                        String(divorceMarriage.spouse2Id)
                      );
                      return `${s1?.firstName || ""} ${s1?.lastName || ""} + ${
                        s2?.firstName || ""
                      } ${s2?.lastName || ""}`
                        .replace(/\s+/g, " ")
                        .trim();
                    })()
                  : ""
              }
              onConfirm={handleDivorceConfirm}
              loading={loading}
            />
          </>
        )}
      </MainCard>
    </Container>
  );
};

FamilyManage.propTypes = {
  familyState: PropTypes.object.isRequired,
  getFamilyFlat: PropTypes.func.isRequired,
  getFamilyTree: PropTypes.func.isRequired,
  initFamily: PropTypes.func.isRequired,
  createFamilyMemberAction: PropTypes.func.isRequired,
  updateFamilyMemberAction: PropTypes.func.isRequired,
  createFamilyMarriageAction: PropTypes.func.isRequired,
  addChildToMarriageAction: PropTypes.func.isRequired,
  updateChildOrderAction: PropTypes.func.isRequired,
  updateMarriageAction: PropTypes.func.isRequired,
  deleteFamilyMemberAction: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  familyState: state.family,
});

export default connect(mapStateToProps, {
  getFamilyFlat,
  getFamilyTree,
  initFamily,
  createFamilyMemberAction,
  updateFamilyMemberAction,
  createFamilyMarriageAction,
  addChildToMarriageAction,
  updateChildOrderAction,
  updateMarriageAction,
  deleteFamilyMemberAction,
})(FamilyManage);
