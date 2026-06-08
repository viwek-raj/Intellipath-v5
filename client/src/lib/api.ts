import axios from 'axios';

const api = axios.create({
    baseURL: process.env.BASE_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 (stale/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isUnauthorized = error.response?.status === 401;
        const isSuspended = error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_SUSPENDED';

        if (
            (isUnauthorized || isSuspended) &&
            typeof window !== 'undefined' &&
            !error.config?.url?.includes('/auth/login') &&
            !error.config?.url?.includes('/auth/register')
        ) {
            // Clear stale auth data
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'accountStatus=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// ============================================================
// AUTH API
// ============================================================

export const authApi = {
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    register: (data: { name: string; email: string; password: string }) =>
        api.post('/auth/register', data),
    googleLogin: (credential: string) =>
        api.post('/auth/google', { credential }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        api.put('/auth/change-password', data),
    subscribe: (email: string) => api.post('/auth/subscribe', { email }),
    deleteAccount: () =>
        api.delete('/auth/profile'),
};

// ============================================================
// ADMIN API
// ============================================================

export const adminApi = {
    // Users
    getDashboardStats: () => api.get('/admin/dashboard'),
    createInstructor: (data: { name: string; email: string; password: string; bio?: string; specializations?: string[] }) =>
        api.post('/admin/instructors', data),
    getAllUsers: (params?: { role?: string; status?: string; page?: number; limit?: number; search?: string }) =>
        api.get('/admin/users', { params }),
    getUserById: (id: string) => api.get(`/admin/users/${id}`),
    revokeSuspension: (id: string) => api.patch(`/admin/users/${id}/revoke-suspension`),
    suspendUser: (id: string, reason?: string) =>
        api.patch(`/admin/users/${id}/suspend`, { reason }),
    deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

    // Taxonomy — Categories
    createCategory: (data: { name: string; description?: string; icon?: string; order?: number }) =>
        api.post('/admin/categories', data),
    getCategories: () => api.get('/admin/categories'),
    updateCategory: (id: string, data: { name?: string; description?: string; icon?: string; isActive?: boolean; order?: number }) =>
        api.put(`/admin/categories/${id}`, data),
    deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),

    // Taxonomy — SubCategories
    createSubCategory: (data: { name: string; categoryId: string; description?: string; order?: number }) =>
        api.post('/admin/subcategories', data),
    getSubCategories: (categoryId?: string) =>
        api.get('/admin/subcategories', { params: { categoryId } }),
    updateSubCategory: (id: string, data: { name?: string; description?: string; isActive?: boolean; order?: number }) =>
        api.put(`/admin/subcategories/${id}`, data),
    deleteSubCategory: (id: string) => api.delete(`/admin/subcategories/${id}`),

    // Taxonomy — Tags
    createTag: (data: { name: string; subCategoryId: string }) =>
        api.post('/admin/tags', data),
    getTags: (subCategoryId?: string) =>
        api.get('/admin/tags', { params: { subCategoryId } }),
    updateTag: (id: string, data: { name?: string; isActive?: boolean }) =>
        api.put(`/admin/tags/${id}`, data),
    deleteTag: (id: string) => api.delete(`/admin/tags/${id}`),
};

// ============================================================
// TAXONOMY API (Public read-only)
// ============================================================

export const taxonomyApi = {
    getCategories: () => api.get('/taxonomy/categories'),
    getSubCategories: (catId: string) => api.get(`/taxonomy/subcategories/${catId}`),
    getTags: (subCatId: string) => api.get(`/taxonomy/tags/${subCatId}`),
    searchTags: (q: string) => api.get('/taxonomy/tags/search', { params: { q } }),
};

// ============================================================
// BATCH API
// ============================================================

export const batchApi = {
    // Instructor
    createBatch: (data: { title: string; description?: string; startDate: string; endDate: string; maxStudents?: number }) =>
        api.post('/batches', data),
    getMyBatches: () => api.get('/batches/my'),
    updateBatch: (id: string, data: Record<string, unknown>) =>
        api.put(`/batches/${id}`, data),
    deleteBatch: (id: string) => api.delete(`/batches/${id}`),
    getBatchStudents: (id: string) => api.get(`/batches/${id}/students`),
    removeStudent: (batchId: string, studentId: string) =>
        api.delete(`/batches/${batchId}/students/${studentId}`),
    getBatchAnalytics: (id: string) => api.get(`/batches/${id}/analytics`),

    // Student
    browseBatches: (params?: { search?: string; page?: number; limit?: number }) =>
        api.get('/batches/browse', { params }),
    joinBatch: (id: string) => api.post(`/batches/${id}/join`),
    leaveBatch: (id: string) => api.post(`/batches/${id}/leave`),
    getEnrolledBatches: () => api.get('/batches/enrolled'),
    getBatchDetail: (id: string) => api.get(`/batches/${id}`),
};

// ============================================================
// LECTURE API
// ============================================================

export const lectureApi = {
    // Instructor
    uploadLecture: (formData: FormData) =>
        api.post('/lectures', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: undefined, // Caller can override
        }),
    uploadLectureVideo: (id: string, formData: FormData, onUploadProgress?: (progressEvent: any) => void) =>
        api.put(`/lectures/${id}/video`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        }),
    uploadLectureNotes: (id: string, formData: FormData) =>
        api.put(`/lectures/${id}/notes`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getUploadStatus: (id: string) => api.get(`/lectures/${id}/status`),
    updateLecture: (id: string, data: Record<string, unknown>) =>
        api.put(`/lectures/${id}`, data),
    deleteLecture: (id: string) => api.delete(`/lectures/${id}`),
    reorderLectures: (data: { batchId: string; ordering: { lectureId: string; order: number }[] }) =>
        api.put('/lectures/reorder', data),
    getLectureAnalytics: (id: string) => api.get(`/lectures/${id}/analytics`),
    getMuxUploadUrl: () => api.post(`/lectures/upload-url`),
    syncMuxStatus: (id: string) => api.post(`/lectures/${id}/sync-mux`),
    createLiveStream: (data: any) => api.post('/lectures/live', data),
    endLiveStream: (id: string) => api.post(`/lectures/${id}/end-live`),

    // Student
    getLecturesByBatch: (batchId: string) => api.get(`/lectures/batch/${batchId}`),
    getLectureById: (id: string) => api.get(`/lectures/${id}`),
    getStreamUrl: (lectureId: string) =>
        `${api.defaults.baseURL}/lectures/${lectureId}/stream/master.m3u8`,
    downloadNotes: (id: string) =>
        api.get(`/lectures/${id}/notes`, { responseType: 'blob' }),
    updateProgress: (id: string, watchedSeconds: number) =>
        api.post(`/lectures/${id}/progress`, { watchedSeconds }),
    getProgress: (id: string) => api.get(`/lectures/${id}/progress`),

    // Global search
    searchByTag: (tagId: string, params?: { page?: number; limit?: number }) =>
        api.get(`/lectures/tag/${tagId}`, { params }),
};

// ============================================================
// QUIZ API
// ============================================================
export const quizApi = {
    createQuiz: (data: Record<string, any>) => api.post('/quizzes', data),
    getInstructorQuizzes: (batchId: string) => api.get(`/quizzes/batch/${batchId}/instructor`),
    getQuizSubmissions: (quizId: string) => api.get(`/quizzes/${quizId}/submissions`),
    evaluateSubmission: (quizId: string, subId: string, data: any) => api.post(`/quizzes/${quizId}/submissions/${subId}/evaluate`, data),
    reopenSubmission: (quizId: string, subId: string, data?: any) => api.post(`/quizzes/${quizId}/submissions/${subId}/reopen`, data),
        
    getStudentQuizzes: (batchId: string) => api.get(`/quizzes/batch/${batchId}`),
    startQuiz: (quizId: string) => api.post(`/quizzes/${quizId}/start`),
    submitQuiz: (quizId: string, data: { answers: any[] }) => api.post(`/quizzes/${quizId}/submit`, data),
};

// ============================================================
// ASSIGNMENT API
// ============================================================
export const assignmentApi = {
    createAssignment: (data: Record<string, any>) => api.post('/assignments', data),
    getInstructorAssignments: (batchId: string) => api.get(`/assignments/batch/${batchId}/instructor`),
    getAssignmentSubmissions: (assignmentId: string) => api.get(`/assignments/${assignmentId}/submissions`),
    evaluateAssignment: (assignmentId: string, subId: string, data: { score: number, feedback?: string }) => 
        api.post(`/assignments/${assignmentId}/submissions/${subId}/evaluate`, data),
        
    getStudentAssignments: (batchId: string) => api.get(`/assignments/batch/${batchId}`),
    submitAssignment: (assignmentId: string, data: FormData) => 
        api.post(`/assignments/${assignmentId}/submit`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    downloadAssignment: (subId: string) => 
        api.get(`/assignments/submissions/${subId}/download`, { responseType: 'blob' }),
};

// ============================================================
// STUDENT API
// ============================================================
export const studentApi = {
    getDashboardAnalytics: () => api.get('/student/dashboard/analytics'),
    getActivity: () => api.get('/student/dashboard/activity'),
    getPendingTasks: () => api.get('/student/dashboard/pending-tasks')
};

// ============================================================
// PUBLIC API
// ============================================================
export const publicApi = {
    getLandingPageStats: () => api.get('/public/stats'),
    getFeaturedBatches: () => api.get('/public/batches/featured')
};

