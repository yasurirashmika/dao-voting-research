import React, { useState } from "react";
import Card from "../../common/Card/Card";
import Button from "../../common/Button/Button";
import Input from "../../common/Input/Input";
import {
  validateProposalTitle,
  validateProposalDescription,
} from "../../../utils/validators";
import { MAX_VALUES } from "../../../utils/constants";
import "./CreateProposal.css";

const CreateProposal = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const titleValidation = validateProposalTitle(formData.title);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error;
    }

    const descValidation = validateProposalDescription(formData.description);
    if (!descValidation.valid) {
      newErrors.description = descValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add this function before handleSubmit:
  const checkVoterRegistration = async () => {
    try {
      const { read } = useContract("DAOVoting", DAOVotingABI.abi);
      const isRegistered = await read("isVoterRegistered", [address]);

      if (!isRegistered) {
        alert("You need to register as a voter first!");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking voter registration:", error);
      return false;
    }
  };

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   if (validateForm()) {
  //     onSubmit(formData);
  //   }
  // };

  // REPLACE the handleSubmit function:

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet to create a proposal");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // DAOVoting contract expects: title, description, minTokensRequired, minReputationRequired
      await createProposal(
        formData.title,
        formData.description,
        0, // minTokensRequired - set to 0 or get from form
        0 // minReputationRequired - set to 0 or get from form
      );

      alert("Proposal created successfully!");
      navigate("/proposals");
    } catch (error) {
      console.error("Error creating proposal:", error);
      alert("Failed to create proposal: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="large" className="create-proposal-form">
      <form onSubmit={handleSubmit}>
        <Input
          label="Proposal Title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Enter proposal title..."
          error={errors.title}
          helperText={`${formData.title.length}/${MAX_VALUES.PROPOSAL_TITLE_LENGTH} characters`}
          required
          fullWidth
        />

        <Input
          label="Description"
          multiline
          rows={10}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Describe your proposal in detail..."
          error={errors.description}
          helperText={`${formData.description.length}/${MAX_VALUES.PROPOSAL_DESCRIPTION_LENGTH} characters`}
          required
          fullWidth
        />

        <div className="form-actions">
          <Button type="submit" loading={loading} fullWidth>
            {loading ? "Creating..." : "Create Proposal"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CreateProposal;
