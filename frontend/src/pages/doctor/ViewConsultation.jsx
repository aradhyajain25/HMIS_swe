import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const ViewConsultation = () => {
  const { id } = useParams(); // Get the consultation ID from URL params
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    diagnosis: '',
    prescription: '',
    remarks: ''
  });
  
  // States for voice recording functionality
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const [recordingStatus, setRecordingStatus] = useState('');
  
  // States for AI processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  
  // Refs for recording and transcript
  const recognitionRef = useRef(null);
  const currentTranscriptRef = useRef('');
  
  // API configuration - using environment variables
  const API_KEY = ''; // Add your Gemini API key here
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Mock function to fetch consultation data
  const fetchConsultationData = (consultationId) => {
    // This would be replaced with an actual API call in production
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock data for demonstration purposes
        const mockConsultations = {
          "1": {
            consult_id: 1,
            patient_id: 101,
            patient_name: "John Doe",
            doctor_id: 201,
            doctor_name: "Dr. Smith",
            booked_date_time: "2023-08-15T10:00:00",
            status: "completed",
            reason: "Regular checkup",
            diagnosis: "Mild hypertension",
            created_at: "2023-08-10T14:30:00",
            actual_start_datetime: "2023-08-15T10:05:00",
            remarks: "Patient should monitor blood pressure regularly",
            bill_id: 301,
            prescription: "Amlodipine 5mg once daily",
            reports: ["Blood Pressure: 140/90", "Pulse: 72 bpm"]
          },
          "2": {
            consult_id: 2,
            patient_id: 102,
            patient_name: "Jane Smith",
            doctor_id: 202,
            doctor_name: "Dr. Johnson",
            booked_date_time: "2023-08-16T14:30:00",
            status: "scheduled",
            reason: "Follow-up visit",
            diagnosis: "",
            created_at: "2023-08-12T09:15:00",
            actual_start_datetime: null,
            remarks: "",
            bill_id: null,
            prescription: "",
            reports: []
          },
          "3": {
            consult_id: 3,
            patient_id: 103,
            patient_name: "Robert Johnson",
            doctor_id: 201,
            doctor_name: "Dr. Smith",
            booked_date_time: "2023-08-14T11:00:00",
            status: "completed",
            reason: "Persistent cough",
            diagnosis: "Acute bronchitis",
            created_at: "2023-08-13T16:45:00",
            actual_start_datetime: "2023-08-14T11:10:00",
            remarks: "Follow up in two weeks if symptoms persist",
            bill_id: 302,
            prescription: "Amoxicillin 500mg three times daily for 7 days",
            reports: ["Chest X-ray: Clear", "Throat swab: Negative for strep"]
          },
          "4": {
            consult_id: 4,
            patient_id: 104,
            patient_name: "Emily Williams",
            doctor_id: 203,
            doctor_name: "Dr. Lee",
            booked_date_time: "2023-08-17T09:30:00",
            status: "scheduled",
            reason: "Annual physical",
            diagnosis: "",
            created_at: "2023-08-14T10:20:00",
            actual_start_datetime: null,
            remarks: "",
            bill_id: null,
            prescription: "",
            reports: []
          }
        };

        const consultation = mockConsultations[consultationId];
        if (consultation) {
          resolve({ success: true, data: consultation });
        } else {
          resolve({ success: false, message: "Consultation not found" });
        }
      }, 800); // Simulate network delay
    });
  };
  
  // Mock function to update consultation
  const updateConsultation = (consultationId, updatedData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Updating consultation ${consultationId} with:`, updatedData);
        resolve({ success: true, message: "Consultation updated successfully" });
      }, 800);
    });
  };

  useEffect(() => {
    const getConsultationData = async () => {
      try {
        setLoading(true);
        const response = await fetchConsultationData(id);
        
        if (response.success) {
          setConsultation(response.data);
          // Initialize edited data with current values
          setEditedData({
            diagnosis: response.data.diagnosis || '',
            prescription: response.data.prescription || '',
            remarks: response.data.remarks || ''
          });
          setError(null);
        } else {
          setError(response.message || "Failed to fetch consultation data");
          setConsultation(null);
        }
      } catch (err) {
        setError("An error occurred while fetching the consultation data");
        setConsultation(null);
      } finally {
        setLoading(false);
      }
    };

    getConsultationData();
  }, [id]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      const updatedConsultation = {
        ...consultation,
        diagnosis: editedData.diagnosis,
        prescription: editedData.prescription,
        remarks: editedData.remarks
      };
      
      const response = await updateConsultation(id, {
        diagnosis: editedData.diagnosis,
        prescription: editedData.prescription,
        remarks: editedData.remarks
      });
      
      if (response.success) {
        // Update local state with the edited values
        setConsultation(updatedConsultation);
        setIsEditing(false);
        // Show success message
        alert("Consultation updated successfully!");
      } else {
        alert("Failed to update consultation: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating consultation:", error);
      alert("An error occurred while updating the consultation");
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    // Reset to original values
    setEditedData({
      diagnosis: consultation.diagnosis || '',
      prescription: consultation.prescription || '',
      remarks: consultation.remarks || ''
    });
    setIsEditing(false);
    setRecordingStatus('');
    setRecordedText('');
    setAiMessage('');
    
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
  };
  
      // Start recording
  const startRecording = () => {
    // Check if SpeechRecognition is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setRecordingStatus('Speech recognition not supported in this browser.');
      return;
    }
    
    // Clear previous context
    setIsRecording(true);
    setRecordingStatus('Listening... Speak naturally about diagnosis, prescription, and/or remarks. All relevant fields will be updated.');
    setRecordedText('');
    setAiMessage('');
    
    
    // Reset transcript ref
    currentTranscriptRef.current = '';
    
    // Set up speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    
    recognitionRef.current.onstart = () => {
      setRecordingStatus('Listening... Speak normally and the AI will categorize your input.');
    };
    
    recognitionRef.current.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      // Update both the state and the ref
      setRecordedText(transcript);
      currentTranscriptRef.current = transcript;
    };
    
    recognitionRef.current.onerror = (event) => {
      setRecordingStatus(`Error: ${event.error}`);
      stopRecording();
    };
    
    recognitionRef.current.onend = () => {
      setRecordingStatus('Processing your voice input...');
      // Process using the ref value which has the latest transcript
      if (currentTranscriptRef.current) {
        processVoiceWithAI(currentTranscriptRef.current);
      } else {
        setRecordingStatus('No speech detected. Try again.');
      }
    };
    
    recognitionRef.current.start();
  };
  
  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Function to call Gemini API with voice transcript
  const processVoiceWithAI = async (transcript) => {
    if (!transcript.trim()) {
      setRecordingStatus('No text to process. Please try again.');
      return;
    }
    
    setIsProcessing(true);
    setAiMessage('Processing your input...');
    
    if (!API_KEY) {
      setAiMessage('API key is not configured. Please add your Gemini API key.');
      setIsProcessing(false);
      return;
    }

    try {
      // Create a prompt that asks the LLM to identify and format multiple categories of medical information
      const prompt = `You are a medical assistant helping a doctor document patient information.
                 Based on the following voice transcript, extract and format any information related to:
                 1. Diagnosis
                 2. Prescription/medication
                 3. General remarks/notes for the patient
                 
                 The doctor may talk about multiple categories in a single voice input. For example, they might
                 mention both a diagnosis and a prescription in the same recording.
                 
                 Return a JSON object with this structure:
                 {
                   "diagnosis": "Formatted diagnosis text or empty string if none found",
                   "prescription": "Formatted prescription text or empty string if none found",
                   "remarks": "Formatted remarks text or empty string if none found",
                   "categoriesFound": ["list", "of", "categories", "found"]
                 }
                 
                 For any category where you don't find relevant information, use an empty string.
                 Format each type of content appropriately:
                 - Diagnosis: Clear, concise medical terms
                 - Prescription: Medication names, dosages, frequency, and duration
                 - Remarks: Clear instructions or notes for the patient
                 
                 Voice transcript: ${transcript}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text.trim();
        
        try {
          // Extract the JSON from the response
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          
          if (parsedResponse) {
            const { diagnosis, prescription, remarks, categoriesFound = [] } = parsedResponse;
            const newData = { ...editedData };
            let fieldsUpdated = [];
            
            // Update each field that has content
            if (diagnosis && diagnosis.trim()) {
              newData.diagnosis = diagnosis;
              fieldsUpdated.push('diagnosis');
            }
            
            if (prescription && prescription.trim()) {
              newData.prescription = prescription;
              fieldsUpdated.push('prescription');
            }
            
            if (remarks && remarks.trim()) {
              newData.remarks = remarks;
              fieldsUpdated.push('remarks');
            }
            
            if (fieldsUpdated.length > 0) {
              // Update all fields at once
              setEditedData(newData);
              
              // Create a message about which fields were updated
              const fieldNames = fieldsUpdated.map(field => 
                field.charAt(0).toUpperCase() + field.slice(1)
              );
              
              let message;
              if (fieldNames.length === 1) {
                message = `Successfully updated ${fieldNames[0]} field.`;
              } else if (fieldNames.length === 2) {
                message = `Successfully updated ${fieldNames[0]} and ${fieldNames[1]} fields.`;
              } else {
                // Format list with commas and "and" before the last item
                const lastField = fieldNames.pop();
                message = `Successfully updated ${fieldNames.join(', ')} and ${lastField} fields.`;
              }
              
              setAiMessage(message);
            } else {
              setAiMessage('No relevant medical information was detected. Please try again with clearer input.');
            }
          } else {
            setAiMessage('Could not process the AI response. Please try again.');
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          setAiMessage('Error processing the voice input. Please try again.');
        }
      } else {
        setAiMessage('No useful text was extracted. Please try speaking more clearly.');
      }
    } catch (error) {
      console.error('API error:', error);
      setAiMessage(`Error: ${error.message}`);
    }
    
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <div className="mt-4">
          <Link to="/doctor/appointments" className="text-teal-600 hover:text-teal-800">
            &larr; Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Not Found: </strong>
          <span className="block sm:inline">The requested consultation could not be found.</span>
        </div>
        <div className="mt-4">
          <Link to="/doctor/appointments" className="text-teal-600 hover:text-teal-800">
            &larr; Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Consultation Details</h1>
        <Link to="/doctor/appointments" className="text-teal-600 hover:text-teal-800">
          &larr; Back to Appointments
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Consultation Header */}
        <div className="p-4 bg-teal-600 text-white">
          <h2 className="text-xl font-semibold">Consultation #{consultation.consult_id}</h2>
          <p className="text-teal-100">
            Status: <span className="font-medium capitalize">{consultation.status}</span>
          </p>
        </div>

        {/* Patient and Doctor Info */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold mb-2">Patient Information</h3>
            <p className="mb-1"><span className="font-medium">ID:</span> {consultation.patient_id}</p>
            <p className="mb-1"><span className="font-medium">Name:</span> {consultation.patient_name}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Doctor Information</h3>
            <p className="mb-1"><span className="font-medium">ID:</span> {consultation.doctor_id}</p>
            <p className="mb-1"><span className="font-medium">Name:</span> {consultation.doctor_name}</p>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-3">Appointment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="mb-1"><span className="font-medium">Reason:</span> {consultation.reason}</p>
            <p className="mb-1"><span className="font-medium">Booked Date:</span> {formatDate(consultation.booked_date_time)}</p>
            <p className="mb-1"><span className="font-medium">Created At:</span> {formatDate(consultation.created_at)}</p>
            <p className="mb-1"><span className="font-medium">Started At:</span> {formatDate(consultation.actual_start_datetime)}</p>
          </div>
        </div>

        {/* Medical Details - Editable Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Medical Details</h3>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
              >
                Edit Details
              </button>
            ) : (
              <div className="flex space-x-2">
                <button 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveChanges}
                  className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
          
          {/* Voice Recording Button - Only show in edit mode */}
          {isEditing && (
            <div className="mb-4 flex justify-center">
              <button 
                type="button"
                onClick={toggleRecording}
                className={`px-4 py-2.5 flex items-center justify-center rounded-md transition-colors ${
                  isRecording 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                {isRecording ? 'Stop Recording' : 'Record Medical Notes'}
              </button>
            </div>
          )}
          
          {/* Helper text - Only show in edit mode and when not recording */}
          {isEditing && !isRecording && !recordingStatus && !aiMessage && (
            <div className="mb-4 text-center text-gray-600 text-sm">
              <p>Click the button above and speak naturally about diagnosis, prescription, and/or remarks.</p>
              <p>Multiple fields can be updated from a single recording.</p>
            </div>
          )}
          
          {/* Voice Recording Status */}
          {isEditing && (recordingStatus || aiMessage) && (
            <div className={`mb-4 p-3 text-sm rounded ${
              recordingStatus.includes('Error') || aiMessage.includes('Error')
                ? 'bg-red-100 text-red-700'
                : isRecording
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : aiMessage.includes('updated')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {recordingStatus || aiMessage}
              {recordedText && (
                <div className="mt-2 py-1 px-2 bg-white rounded font-medium text-gray-800">
                  "{recordedText}"
                </div>
              )}
            </div>
          )}
          
          {/* Diagnosis Section */}
          <div className="mb-4">
            <p className="font-medium">Diagnosis:</p>
            {!isEditing ? (
              <p className="bg-gray-50 p-3 rounded mt-1">{consultation.diagnosis || "No diagnosis recorded"}</p>
            ) : (
              <div className="mt-1">
                <textarea
                  name="diagnosis"
                  value={editedData.diagnosis}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows="3"
                  placeholder="Enter diagnosis"
                ></textarea>
              </div>
            )}
          </div>
          
          {/* Prescription Section */}
          <div className="mb-4">
            <p className="font-medium">Prescription:</p>
            {!isEditing ? (
              <p className="bg-gray-50 p-3 rounded mt-1">{consultation.prescription || "No prescription recorded"}</p>
            ) : (
              <div className="mt-1">
                <textarea
                  name="prescription"
                  value={editedData.prescription}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows="3"
                  placeholder="Enter prescription"
                ></textarea>
              </div>
            )}
          </div>
          
          {/* Remarks Section */}
          <div className="mb-4">
            <p className="font-medium">Remarks:</p>
            {!isEditing ? (
              <p className="bg-gray-50 p-3 rounded mt-1">{consultation.remarks || "No remarks recorded"}</p>
            ) : (
              <div className="mt-1">
                <textarea
                  name="remarks"
                  value={editedData.remarks}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows="3"
                  placeholder="Enter remarks"
                ></textarea>
              </div>
            )}
          </div>
        </div>

        {/* Medical Reports */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-3">Medical Reports</h3>
          {consultation.reports && consultation.reports.length > 0 ? (
            <ul className="list-disc pl-5">
              {consultation.reports.map((report, index) => (
                <li key={index} className="mb-1">{report}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No reports available</p>
          )}
        </div>

        {/* Actions Footer */}
        {consultation.status === "scheduled" && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button 
                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                onClick={() => setIsEditing(true)}
              >
                Edit Consultation
              </button>
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                onClick={() => alert("Cancel functionality would go here")}
              >
                Cancel Consultation
              </button>
            </div>
          </div>
        )}

        {/* Billing Information */}
        {consultation.bill_id && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Billing Information</h3>
            <p><span className="font-medium">Bill ID:</span> {consultation.bill_id}</p>
            <button 
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => alert("View bill details would go here")}
            >
              View Bill Details
            </button>
          </div>
        )}
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default ViewConsultation;