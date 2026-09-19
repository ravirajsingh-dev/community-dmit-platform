import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Container } from "react-bootstrap";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import TrainingVideosSection from "@src/views/Layout/Components/TrainingVideos/TrainingVideosSection";

import { getTrainingVideos } from "@src/actions/trainingVideoActions";

const TrainingVideosIndex = () => {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth?.user);
  const trainingState = useSelector((state) => state.trainingVideo || {});
  const { videos = [], loading, error } = trainingState;

  useEffect(() => {
    dispatch(getTrainingVideos());
  }, [dispatch]);

  const activeDesignationCodes = useMemo(() => {
    const designations = Array.isArray(user?.designations)
      ? user.designations
      : Array.isArray(user?.userDesignations)
        ? user.userDesignations
        : [];

    const toCodeNum = (code) => {
      const n = typeof code === "string" ? parseInt(code, 10) : code;
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const getStatus = (status) => String(status ?? "").toUpperCase();

    const approved = designations
      .map((d) => ({
        code: d ? toCodeNum(d.designationCode) : null,
        status: getStatus(d?.status),
      }))
      .filter((x) => x.code != null && x.status === "APPROVED")
      .map((x) => x.code);

    const pending = designations
      .map((d) => ({
        code: d ? toCodeNum(d.designationCode) : null,
        status: getStatus(d?.status),
      }))
      .filter((x) => x.code != null && x.status === "PENDING")
      .map((x) => x.code);

    // Fallback: if approved/pending empty due to inconsistent DB/status values,
    // still show videos for any designation code the user has.
    const allCodes = [
      ...designations
        .map((d) => toCodeNum(d?.designationCode))
        .filter((x) => x != null),
    ];

    const codes =
      approved.length > 0 ? approved : pending.length > 0 ? pending : allCodes;
    if (!Array.isArray(codes) || codes.length === 0) return [];

    // Unique + stable sort for predictable section order.
    return [...new Set(codes)].sort((a, b) => a - b);
  }, [user]);

  const filteredVideos = useMemo(() => {
    const list = Array.isArray(videos) ? videos : [];
    const sorted = [...list].sort(
      (a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0),
    );

    if (!activeDesignationCodes || activeDesignationCodes.length === 0)
      return sorted;

    return sorted.filter((v) => {
      const rawCodes = Array.isArray(v.designations)
        ? v.designations
        : v.designations != null
          ? [v.designations]
          : [];

      return rawCodes.some((code) => {
        const n = typeof code === "string" ? parseInt(code, 10) : code;
        return Number.isFinite(n) && activeDesignationCodes.includes(n);
      });
    });
  }, [videos, activeDesignationCodes]);

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Training Videos"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Training Videos" },
        ]}
      />
      {error?.message && !loading && (
        <Alert variant="danger" className="mt-3">
          {error.message}
        </Alert>
      )}
      <TrainingVideosSection
        loading={loading}
        activeDesignationCodes={activeDesignationCodes}
        videos={filteredVideos}
      />
    </Container>
  );
};

export default TrainingVideosIndex;
