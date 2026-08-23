import { userFacingError } from './userFacingError';

describe('userFacingError', () => {
  it('prefers a clean API message', () => {
    expect(userFacingError({ response: { data: { message: 'Invite already accepted' } } }, 'Failed'))
      .toBe('Invite already accepted');
  });

  it('rewrites shared-account wording for customers', () => {
    expect(userFacingError({ response: { data: { message: 'Shared account not found' } } }, 'Failed'))
      .toBe('This Shared Account could not be found.');
  });

  it('hides Axios status and Mongo-style errors', () => {
    expect(userFacingError({ response: { data: { message: 'Request failed with status code 500' } } }, 'Please try again.'))
      .toBe('Please try again.');
    expect(userFacingError({ response: { data: { message: 'Cast to ObjectId failed for value' } } }, 'Please try again.'))
      .toBe('Please try again.');
  });

  it('uses a wrapped Error message when no API body is present', () => {
    expect(userFacingError(new Error('Invalid credentials'), 'Login failed'))
      .toBe('Invalid credentials');
  });

  it('hides endpoint URLs', () => {
    expect(userFacingError({ response: { data: { message: 'POST /api/users/login failed' } } }, 'Please try again.'))
      .toBe('Please try again.');
  });
});
