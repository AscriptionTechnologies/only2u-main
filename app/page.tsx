import React from 'react'
import LoginPage from './auth/Login/page';
import UserMang from './admin/UserManagement/page'
import DashboardPage from './admin/Dashboard/page';

const page = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gray-50">
      <LoginPage />
    </main>
  )
}

export default page;