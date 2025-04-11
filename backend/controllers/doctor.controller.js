import mongoose from 'mongoose';
import { Consultation, Prescription } from '../models/consultation.js';
import Diagnosis from '../models/diagnosis.js'; 
import Patient from '../models/patient.js';

// Utility to format a 30-min time slot
const formatTimeSlot = (start) => {
  const startTime = new Date(start);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  const format = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${format(startTime)} - ${format(endTime)}`;
};

// GET /doctor/appointments
export const fetchAppointments = async (req, res) => {
  try {
    const doctorId = req.user?.doctor_id;
    if (!doctorId) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }

    const consultations = await Consultation.find({
      doctor_id: doctorId,
      status: { $in: ['scheduled', 'ongoing', 'completed'] }
    }).populate('patient_id', 'name').sort({ booked_date_time: 1 });

    if (!consultations.length) {
      return res.status(404).json({ message: "No appointments found" });
    }

    const appointments = consultations.map((c) => ({
      id: c._id,
      patientName: c.patient_id?.name || 'Unknown',
      timeSlot: formatTimeSlot(c.booked_date_time),
      isDone: c.status === 'completed'
    }));

    res.json(appointments);
  } catch (err) {
    console.error("Error in fetchAppointments:", err);
    res.status(500).json({ error: "Server error while fetching appointments" });
  }
};

// PUT /doctor/appointments
export const updateAppointments = async (req, res) => {
  try {
    const doctorId = req.user?.doctor_id;
    if (!doctorId) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }

    const { id, isDone } = req.body;

    if (!id || typeof isDone !== 'boolean') {
      return res.status(400).json({ error: "Missing or invalid 'id' or 'isDone' field" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid consultation ID format" });
    }

    const consultation = await Consultation.findOne({ _id: id, doctor_id: doctorId });
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found for this doctor" });
    }

    consultation.status = isDone ? "completed" : "ongoing";
    await consultation.save();

    res.json({ message: "Appointment status updated successfully" });
  } catch (err) {
    console.error("Error in updateAppointments:", err);
    res.status(500).json({ error: "Server error while updating appointment" });
  }
};

export const fetchPatientConsultations = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { patientId } = req.params;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!patientId) {
      return res.status(400).json({
        error: 'Patient ID is required'
      });
    }
    
    const query = { 
      patient_id: parseInt(patientId) 
    };
    
    const consultations = await Consultation.find(query)
      .populate('doctor_id', 'name specialization')
      .populate('prescription')
      .sort({ booked_date_time: -1 });
    
    if (!consultations.length) {
      return res.status(404).json({ message: "No consultations found for this patient" });
    }
    
    res.json(consultations);
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    res.status(500).json({
      error: 'Server error while fetching consultations',
      message: error.message
    });
  }
};

export const fetchPatientProgress = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { patientId } = req.params;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!patientId) {
      return res.status(400).json({
        error: 'Patient ID is required'
      });
    }

    // First verify this doctor has access to this patient (has consultations)
    const hasConsultation = await Consultation.findOne({
      doctor_id: doctor_id,
      patient_id: parseInt(patientId)
    });

    if (!hasConsultation) {
      return res.status(403).json({ 
        error: "Unauthorized: No consultations found for this patient under your care" 
      });
    }
    
    // Fetch the patient with vitals
    const patient = await Patient.findById(parseInt(patientId))
      .select('name vitals');
    
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    // Sort vitals by date (most recent first)
    const sortedVitals = patient.vitals.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    res.status(200).json({
      success: true,
      patientName: patient.name,
      data: sortedVitals
    });
  } catch (error) {
    console.error('Error fetching patient progress:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patient progress',
      error: error.message
    });
  }
};

export const addDiagnosis = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId } = req.params;
    const { diagnosis } = req.body; // Always an array of diagnosis strings
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !diagnosis || !Array.isArray(diagnosis) || diagnosis.length === 0) {
      return res.status(400).json({ error: "Consultation ID and diagnosis array are required" });
    }
    
    // Find the consultation and verify doctor has permission
    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctor_id: doctor_id
    });
    
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found or access denied" });
    }
    
    // Create and save diagnosis objects
    const diagnosisPromises = diagnosis.map(async (diagnosisName) => {
      if (typeof diagnosisName !== 'string' || !diagnosisName.trim()) {
        throw new Error('All diagnosis entries must be non-empty strings');
      }
      const newDiagnosis = new Diagnosis({ name: diagnosisName });
      return await newDiagnosis.save();
    });
    
    const savedDiagnoses = await Promise.all(diagnosisPromises);
    const diagnosisIds = savedDiagnoses.map(d => d._id);
    
    // Update consultation with new diagnosis IDs
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      consultationId,
      { $addToSet: { diagnosis: { $each: diagnosisIds } } },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error adding diagnosis:', error);
    res.status(500).json({
      error: 'Server error while adding diagnosis',
      message: error.message
    });
  }
};

export const addRemarks = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId } = req.params;
    const { remark } = req.body;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !remark) {
      return res.status(400).json({ error: "Consultation ID and remark are required" });
    }
    
    // Find the consultation and verify doctor has permission
    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctor_id: doctor_id
    });
    
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found or access denied" });
    }
    
    // Update consultation with new remark
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      consultationId,
      { remark: remark },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error adding remark:', error);
    res.status(500).json({
      error: 'Server error while adding remark',
      message: error.message
    });
  }
};

export const addPrescription = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId } = req.params;
    const { prescriptionData } = req.body;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !prescriptionData || !prescriptionData.entries) {
      return res.status(400).json({ error: "Consultation ID and prescription data are required" });
    }
    
    // Find the consultation and verify doctor has permission
    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctor_id: doctor_id
    });
    
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found or access denied" });
    }
    
    // Create a new prescription
    const newPrescription = new Prescription({
      prescriptionDate: new Date(),
      status: "pending",
      entries: prescriptionData.entries
    });
    
    const savedPrescription = await newPrescription.save();
    
    // Update consultation with new prescription
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      consultationId,
      { $push: { prescription: savedPrescription._id } },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error adding prescription:', error);
    res.status(500).json({
      error: 'Server error while adding prescription',
      message: error.message
    });
  }
};

// Update a specific diagnosis by ID
export const updateDiagnosisById = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId, diagnosisId } = req.params;
    const { diagnosis } = req.body;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !diagnosisId || !diagnosis) {
      return res.status(400).json({ 
        error: "Consultation ID, diagnosis ID and updated diagnosis are required" 
      });
    }
    
    // Find the consultation and verify doctor has permission
    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctor_id: doctor_id,
      diagnosis: diagnosisId
    });
    
    if (!consultation) {
      return res.status(404).json({ 
        error: "Consultation not found, access denied, or diagnosis not found in this consultation" 
      });
    }
    
    // Update the specific diagnosis
    await Diagnosis.findByIdAndUpdate(
      diagnosisId,
      { name: diagnosis }
    );
    
    // Fetch updated consultation
    const updatedConsultation = await Consultation.findById(consultationId);
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error updating diagnosis by ID:', error);
    res.status(500).json({
      error: 'Server error while updating diagnosis',
      message: error.message
    });
  }
};

// Update all diagnoses for a consultation (replace with new one)
export const updateAllDiagnosis = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId } = req.params;
    const { diagnosis } = req.body; // Array of diagnosis strings
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !diagnosis || !Array.isArray(diagnosis) || diagnosis.length === 0) {
      return res.status(400).json({ error: "Consultation ID and diagnosis array are required" });
    }
    
    // Find the consultation and verify doctor has permission
    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctor_id: doctor_id
    });
    
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found or access denied" });
    }
    
    // Create and save diagnosis objects
    const diagnosisPromises = diagnosis.map(async (diagnosisName) => {
      if (typeof diagnosisName !== 'string' || !diagnosisName.trim()) {
        throw new Error('All diagnosis entries must be non-empty strings');
      }
      const newDiagnosis = new Diagnosis({ name: diagnosisName });
      return await newDiagnosis.save();
    });
    
    const savedDiagnoses = await Promise.all(diagnosisPromises);
    const diagnosisIds = savedDiagnoses.map(d => d._id);
    
    // Replace all existing diagnosis entries with the new ones
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      consultationId,
      { diagnosis: diagnosisIds }, // Complete replacement
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error updating all diagnoses:', error);
    res.status(500).json({
      error: 'Server error while updating diagnoses',
      message: error.message
    });
  }
};

export const updateRemark = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId } = req.params;
    const { remark } = req.body;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !remark) {
      return res.status(400).json({ error: "Consultation ID and remark are required" });
    }
    
    // Find and update the consultation
    const updatedConsultation = await Consultation.findOneAndUpdate(
      { _id: consultationId, doctor_id: doctor_id },
      { remark: remark },
      { new: true }
    )

    if (!updatedConsultation) {
      return res.status(404).json({ error: "Consultation not found or access denied" });
    }
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error updating remark:', error);
    res.status(500).json({
      error: 'Server error while updating remark',
      message: error.message
    });
  }
};

// Update a specific prescription by ID
export const updatePrescriptionById = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId, prescriptionId } = req.params;
    const { prescriptionData } = req.body;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !prescriptionId || !prescriptionData || !prescriptionData.entries) {
      return res.status(400).json({ 
        error: "Consultation ID, prescription ID and prescription data are required" 
      });
    }
    
    // Find the consultation and verify doctor has permission
    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctor_id: doctor_id,
      prescription: parseInt(prescriptionId)
    });
    
    if (!consultation) {
      return res.status(404).json({ 
        error: "Consultation not found, access denied, or prescription not found in this consultation" 
      });
    }
    
    // Update the specific prescription
    await Prescription.findByIdAndUpdate(
      parseInt(prescriptionId),
      { 
        entries: prescriptionData.entries,
        status: "pending" // Reset to pending since it was modified
      }
    );
    
    // Fetch updated consultation
    const updatedConsultation = await Consultation.findById(consultationId)
      .populate('diagnosis')
      .populate('prescription');
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error updating prescription by ID:', error);
    res.status(500).json({
      error: 'Server error while updating prescription',
      message: error.message
    });
  }
};

// Update all prescriptions for a consultation
export const updateAllPrescription = async (req, res) => {
  try {
    const doctor_id = req.user?.doctor_id;
    const { consultationId } = req.params;
    const { prescriptionData } = req.body;
    
    if (!doctor_id) {
      return res.status(400).json({ error: "Doctor ID missing in token" });
    }
    
    if (!consultationId || !prescriptionData || !prescriptionData.entries) {
      return res.status(400).json({ error: "Consultation ID and prescription data are required" });
    }
    
    // Find the consultation and verify doctor has permission
    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctor_id: doctor_id
    });
    
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found or access denied" });
    }
    
    // Create a new prescription
    const newPrescription = new Prescription({
      prescriptionDate: new Date(),
      status: "pending",
      entries: prescriptionData.entries
    });
    
    const savedPrescription = await newPrescription.save();
    
    // Replace all existing prescriptions with just this new one
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      consultationId,
      { prescription: [savedPrescription._id] }, // Complete replacement
      { new: true }
    ).populate('diagnosis')
      .populate('prescription');
    
    res.status(200).json({
      success: true,
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error updating all prescriptions:', error);
    res.status(500).json({
      error: 'Server error while updating prescriptions',
      message: error.message
    });
  }
};