import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);

  // Mock data fetching function - replace with your actual API call
  const fetchAppointments = () => {
    return Promise.resolve([
      { id: 1, patientName: "John Doe", timeSlot: "9:00 AM - 10:00 AM", isDone: true },
      { id: 2, patientName: "Jane Smith", timeSlot: "10:30 AM - 11:30 AM", isDone: false },
      { id: 31, patientName: "Robert Johnson", timeSlot: "1:00 PM - 2:00 PM", isDone: false },
      { id: 4, patientName: "Emily Williams", timeSlot: "3:30 PM - 4:30 PM", isDone: false },
    ]);
  };

  // Mock update function - replace with your actual API call
  const updateAppointment = (id, isDone) => {
    console.log(`Appointment ${id} updated to isDone: ${isDone}`);
    return Promise.resolve({ success: true });
  };

  useEffect(() => {
    const getAppointments = async () => {
      try {
        const data = await fetchAppointments();
        setAppointments(data);
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
      }
    };

    getAppointments();
  }, []);

  const handleToggleDone = async (id, currentStatus) => {
    try {
      await updateAppointment(id, !currentStatus);
      setAppointments(prevAppointments => 
        prevAppointments.map(appointment => 
          appointment.id === id 
            ? { ...appointment, isDone: !currentStatus } 
            : appointment
        )
      );
    } catch (error) {
      console.error("Failed to update appointment:", error);
    }
  };

  return (
    <div className="p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Link 
          to="/doctor/book-appointment" 
          className="px-4 py-2 bg-teal-600 text-white font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          Add Appointment
        </Link>
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-5 text-gray-700 font-medium mb-4">
          <div className="p-3">Appointment Id</div>
          <div className="p-3">Patient Name</div>
          <div className="p-3">Time</div>
          <div className="p-3">Done</div>
          <div className="p-3">Actions</div>
        </div>
        
        {appointments.map((appointment) => (
          <div 
            key={appointment.id} 
            className="grid grid-cols-5 mb-4 rounded-lg overflow-hidden bg-gray-800 text-white"
          >
            <div className="p-4 text-center">AID{appointment.id}</div>
            <div className="p-4">{appointment.patientName}</div>
            <div className="p-4">{appointment.timeSlot}</div>
            <div className="p-4 flex justify-center">
              <div 
                className={`h-6 w-6 rounded flex items-center justify-center cursor-pointer transition-colors ${
                  appointment.isDone ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                }`}
                onClick={() => handleToggleDone(appointment.id, appointment.isDone)}
              >
                {appointment.isDone && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div className="p-4 flex justify-center">
              <Link 
                to={`/doctor/consultation/${appointment.id}`} 
                className="px-3 py-1 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Appointments;