import api from './api';

export interface TutorReview {
  id: string;
  bookingId: string;
  comment: string;
  rating: number;
  reviewerType: 'tutor' | 'student';
  createdAt: string;
  confirmedAt?: string | null;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  courseTitle?: string | null;
  courseDate?: string | null;
}

export interface TutorReviewsResponse {
  success: boolean;
  data: TutorReview[];
  count: number;
}

class ReviewService {
  async getTutorReviews(tutorUserId: string): Promise<TutorReviewsResponse> {
    const response = await api.get(`/reviews/tutor/${tutorUserId}`);
    return response.data;
  }
}

export default new ReviewService();
