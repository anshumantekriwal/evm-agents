import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase } from "../config";
import "./TradingAgentLauncher.css";

// Import slide components
import BasicInfoSlide from "./launcher/BasicInfoSlide";
import ImageUploadSlide from "./launcher/ImageUploadSlide";
import BehaviorSlide from "./launcher/BehaviorSlide";
import OnchainConfigSlide from "./launcher/OnchainConfigSlide";
import ReviewSlide from "./launcher/ReviewSlide";
import AgentSuccess from "./AgentSuccess";

// Types
interface FormState {
  currentStep: number;
  agentName: string;
  agentDescription: string;
  agentImage: File | null;
  agentBehavior: string;
  selectedStrategy: string;
  selectedSources: string[];
  selectedChains: string[];
  ownerAddress: string;
  slippageTolerance: string;
  gasLimit: string;
}

interface UIState {
  isCreating: boolean;
  imagesLoaded: boolean;
  showSuccess: boolean;
  deployedAgent: any;
  reviewEnabled: boolean;
  isGeneratingQuestions: boolean;
  aiRating: number | null;
  followUpQuestions: string[];
  aiJustification: string;
}

interface Chain {
  name: string;
  logo: string;
  comingSoon?: boolean;
}

interface TradingAgentLauncherProps {
  onBack?: () => void;
  onAgentCreated?: (agentId: number) => void;
}

const TradingAgentLauncher = ({
  onBack,
  onAgentCreated,
}: TradingAgentLauncherProps = {}) => {
  const { user } = useAuth0();

  // Consolidated form state
  const [formState, setFormState] = useState<FormState>({
    currentStep: 0,
    agentName: "",
    agentDescription: "",
    agentImage: null,
    agentBehavior: "",
    selectedStrategy: "trading",
    selectedSources: [],
    selectedChains: [],
    ownerAddress: "",
    slippageTolerance: "",
    gasLimit: "",
  });

  // Consolidated UI state
  const [uiState, setUIState] = useState<UIState>({
    isCreating: false,
    imagesLoaded: false,
    showSuccess: false,
    deployedAgent: null,
    reviewEnabled: false,
    isGeneratingQuestions: false,
    aiRating: null,
    followUpQuestions: [],
    aiJustification: "",
  });

  // Static data
  const slides = [
    {
      image:
        "https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture2.png",
      title: "It all starts with a name",
      content: "How should we call your EVM Agent?",
      component: BasicInfoSlide,
    },
    {
      image:
        "https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture3.png",
      title: `Let's upload the picture\nof ${
        formState.agentName || "your agent"
      }`,
      content: "",
      component: ImageUploadSlide,
    },
    {
      image:
        "https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture4.png",
      title: `What do you want\n${formState.agentName || "your agent"} to do?`,
      content: "Describe your agent's behavior and capabilities",
      component: BehaviorSlide,
    },
    {
      image:
        "https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture10.png",
      title: "Configure Trading Parameters",
      content: "Set up onchain properties for your trading agent",
      component: OnchainConfigSlide,
    },
    {
      image: "/login.png",
      title: "Review",
      content: "",
      component: ReviewSlide,
    },
  ];

  const chains: Chain[] = [
    {
      name: "Polygon",
      logo: "https://coin-images.coingecko.com/coins/images/32440/large/polygon.png",
    },
    {
      name: "Ethereum",
      logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
      comingSoon: true,
    },
    {
      name: "Base",
      logo: "https://coin-images.coingecko.com/coins/images/50114/large/base.png",
      comingSoon: true,
    },
    {
      name: "Arbitrum",
      logo: "https://coin-images.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg",
      comingSoon: true,
    },
  ];

  // Preload all static images
  useEffect(() => {
    let isMounted = true;
    const urls = [
      ...slides.map((slide) => slide.image),
      ...chains.map((chain) => chain.logo),
    ];
    let loadedCount = 0;
    urls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === urls.length && isMounted) {
          setUIState((prev) => ({ ...prev, imagesLoaded: true }));
        }
      };
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // State update helpers
  const updateForm = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const updateUI = (field: string, value: any) => {
    setUIState((prev) => ({ ...prev, [field]: value }));
  };

  // Navigation handlers
  const handleNext = () => {
    if (formState.currentStep < slides.length - 1) {
      updateForm("currentStep", formState.currentStep + 1);
    }
  };

  const handleBack = () => {
    if (formState.currentStep > 0) {
      updateForm("currentStep", formState.currentStep - 1);
    }
  };

  // Business logic handlers
  const handleFileUpload = (file: File) => {
    updateForm("agentImage", file);
  };

  // Updated handleCreateKeypair to save to Supabase
  const handleCreateKeypair = async () => {
    updateUI("isCreating", true);

    try {
      console.log("Creating agent with data:", {
        name: formState.agentName,
        description: formState.agentDescription,
        behavior: formState.agentBehavior,
        image: formState.agentImage,
        owner_address: formState.ownerAddress,
        slippage_tolerance: parseFloat(formState.slippageTolerance),
        gas_limit: parseInt(formState.gasLimit),
        selected_chains: formState.selectedChains,
        user_id: user?.sub || user?.email,
      });

      // Upload image to Supabase storage if exists
      let imageUrl = null;
      if (formState.agentImage) {
        const fileExt = formState.agentImage.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("agent-images")
          .upload(fileName, formState.agentImage);

        if (!uploadError) {
          const { data } = supabase.storage
            .from("agent-images")
            .getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      // Insert agent data into Supabase
      const { data, error } = await supabase
        .from("evm-agents")
        .insert([
          {
            name: formState.agentName,
            description: formState.agentDescription,
            prompt: formState.agentBehavior,
            image: imageUrl,
            owner_address: formState.ownerAddress,
            slippage_tolerance: formState.slippageTolerance
              ? parseFloat(formState.slippageTolerance)
              : null,
            gas_limit: formState.gasLimit ? parseInt(formState.gasLimit) : null,
            selected_chains: formState.selectedChains,
            user_id: user?.email,
            agent_wallet: null, // Leave blank as requested
            agent_aws: null, // Leave blank as requested
            agent_deployed: false, // Set to false as requested
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      console.log("Agent created successfully:", data);

      // Navigate to agent dashboard
      if (onAgentCreated && data) {
        onAgentCreated(data[0].id);
      }

      updateUI("isCreating", false);
    } catch (error) {
      console.error("Error creating agent:", error);
      updateUI("isCreating", false);
      // You might want to show an error message to the user here
      alert("Failed to create agent. Please try again.");
    }
  };

  const handleBackToDashboard = () => {
    // Reset all states to go back to dashboard
    setFormState({
      currentStep: 0,
      agentName: "",
      agentDescription: "",
      agentImage: null,
      agentBehavior: "",
      selectedStrategy: "trading",
      selectedSources: [],
      selectedChains: [],
      ownerAddress: "",
      slippageTolerance: "",
      gasLimit: "",
    });

    setUIState({
      isCreating: false,
      imagesLoaded: false,
      showSuccess: false,
      deployedAgent: null,
      reviewEnabled: false,
      isGeneratingQuestions: false,
      aiRating: null,
      followUpQuestions: [],
      aiJustification: "",
    });

    // Call the onBack prop if provided
    if (onBack) {
      onBack();
    }
  };

  const handleAIRating = async () => {
    updateUI("isGeneratingQuestions", true);
    try {
      // Simulate AI rating generation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      updateUI("aiRating", 8.5);
      updateUI(
        "aiJustification",
        "This agent has a clear purpose and well-defined behavior."
      );
      updateUI("followUpQuestions", [
        "Have you considered adding specific trading parameters?",
        "Would you like to add more chains for diversification?",
        "Do you want to set up automated reporting?",
      ]);
    } catch (error) {
      console.error("Error generating AI rating:", error);
    } finally {
      updateUI("isGeneratingQuestions", false);
    }
  };

  const validateInviteCode = async (code: string) => {
    // Simulate invite code validation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (code === "BETA") {
      return { valid: true };
    }
    return { valid: false, error: "Invalid invite code" };
  };

  // Show success page if deployment completed
  if (uiState.showSuccess && uiState.deployedAgent) {
    return (
      <AgentSuccess
        agentData={uiState.deployedAgent}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Loading state
  if (!uiState.imagesLoaded) {
    return (
      <div className="agent-launcher-loading">
        <div className="cool-spinner"></div>
        <div className="cool-loading-text">
          Loading your EVM Agent experience...
        </div>
      </div>
    );
  }

  const currentSlide = slides[formState.currentStep];
  const SlideComponent = currentSlide.component;

  return (
    <div className="agent-launcher-container">
      <div className="launcher-progress-bar-container">
        <div className="launcher-progress-bar-wrapper">
          <div
            className="launcher-progress-bar"
            style={{
              width: ((formState.currentStep + 1) / slides.length) * 100 + "%",
            }}
          />
        </div>
      </div>

      {formState.currentStep > 0 && (
        <button className="back-button" onClick={handleBack}>
          Back
        </button>
      )}

      <div className="slide-container">
        <div className="slide-content">
          <div className="image-container">
            <img
              src={currentSlide.image}
              alt="Slide illustration"
              className="slide-image"
            />
          </div>
          <div className="content-container">
            <h2>{currentSlide.title}</h2>
            {currentSlide.content && <p>{currentSlide.content}</p>}
            <SlideComponent
              formState={formState}
              uiState={uiState}
              updateForm={updateForm}
              updateUI={updateUI}
              handleFileUpload={handleFileUpload}
              handleCreateKeypair={handleCreateKeypair}
              handleAIRating={handleAIRating}
              validateInviteCode={validateInviteCode}
              onNext={handleNext}
              onBack={handleBack}
              chains={chains}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingAgentLauncher;
