import { apiClient } from './apiClient';
import { useBookingStore } from '../stores/useBookingStore';
import { useDeveloperLogsStore } from '../stores/useDeveloperLogsStore';
import { getMockPatients, saveMockPatient, getMockPatient } from './mockDb';
import type { MockPatient } from './mockDb';
import { getOrCreateUserId } from './auth';

export interface RegisterPatientPayload {
  firstName: string;
  lastName: string;
  relation: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  bloodGroup: string;
  mobileNumber: string;
}

const PATIENT_ID_KEY = 'taxi_simulator_patient_id';

// The live API has been seen nesting list responses an extra level deep
// (data: { data: [...], pagination: {...} }) - see the same issue fixed in
// drivers.ts getDrivers(). Normalize both shapes here.
const extractList = (body: any): any[] => {
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.data)) return body.data.data;
  return [];
};

export const getPatients = async (userId?: string) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const data = Object.values(getMockPatients());
    const responseData = {
      success: true,
      message: 'Patients retrieved successfully',
      data,
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'GET',
      url: '/api/v1/patients',
      responseData,
      status: 200,
    });

    return responseData;
  }

  // No-Auth Mode resolves identity from ?userId= for this route (see
  // tracking_api_documentation.html "Patient API"), falling back to user ID
  // "1" server-side if omitted - so always pass the actual registered user.
  const resolvedUserId = userId ?? getOrCreateUserId();
  console.log('[patients] getPatients request userId:', resolvedUserId);
  const response = await apiClient.get('/api/v1/patients', { params: { userId: resolvedUserId } });
  console.log('[patients] getPatients response:', response.data);
  return response.data;
};

export const registerPatient = async (payload: RegisterPatientPayload) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const id = `pat_${Math.random().toString(36).substring(2, 11)}`;
    const mockPatient: MockPatient = { id, ...payload };
    saveMockPatient(mockPatient);

    const responseData = {
      success: true,
      message: 'Patient registered successfully',
      data: mockPatient,
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'POST',
      url: '/api/v1/patients',
      requestData: payload,
      responseData,
      status: 201,
    });

    return responseData;
  }

  // Per tracking_api_documentation.html "Patient API", this is POST /api/v1/patients
  // (not /patients/register), and requires a real auth token - it's not part of the
  // no-auth ?userId= testing scheme. apiClient already attaches the Bearer token.
  console.log('[patients] registerPatient request payload:', payload);
  const response = await apiClient.post('/api/v1/patients', payload);
  console.log('[patients] registerPatient response:', response.data);
  return response.data;
};

export const getPatientCompleteness = async (patientId: string) => {
  const isMock = useBookingStore.getState().mode === 'mock';

  if (isMock) {
    const patient = getMockPatient(patientId);
    const missingFields = patient
      ? Object.entries({
          firstName: patient.firstName,
          lastName: patient.lastName,
          age: patient.age ?? patient.dateOfBirth,
          bloodGroup: patient.bloodGroup,
          mobileNumber: patient.mobileNumber,
          relation: patient.relation,
        }).filter(([, v]) => !v).map(([k]) => k)
      : ['firstName', 'lastName', 'age', 'bloodGroup', 'mobileNumber', 'relation'];

    const responseData = {
      success: true,
      message: 'Completeness status retrieved successfully',
      data: {
        id: patientId,
        name: patient ? `${patient.firstName} ${patient.lastName}` : '',
        relationship: patient?.relation || 'SELF',
        profile_status: missingFields.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
        missing_fields: missingFields,
        fields: patient || {},
      },
    };

    useDeveloperLogsStore.getState().addApiLog({
      method: 'GET',
      url: `/api/v1/patients/${patientId}/completeness`,
      responseData,
      status: 200,
    });

    return responseData;
  }

  // Per the doc this is GET, not POST, and requires a real auth token.
  const response = await apiClient.get(`/api/v1/patients/${patientId}/completeness`);
  return response.data;
};

// Returns a patientId usable for booking. GET /patients auto-creates and
// returns a SELF record for the user if one doesn't exist yet (per the doc),
// so we just take the first entry - registering a patient with relation
// "SELF" ourselves would be rejected ("SELF relation is not allowed" on POST).
export const getOrCreatePatientId = async (): Promise<string> => {
  const cached = sessionStorage.getItem(PATIENT_ID_KEY);
  if (cached) return cached;

  const userId = getOrCreateUserId();
  const list = extractList(await getPatients(userId));
  const existingId = list[0]?.id;
  if (existingId) {
    sessionStorage.setItem(PATIENT_ID_KEY, existingId);
    console.log('[patients] Resolved patientId from GET /patients (auto-created SELF):', existingId);
    return existingId;
  }

  console.log('[patients] GET /patients returned no entries - this should not happen since SELF is auto-created.');
  throw new Error('No patient record found for this user');
};
