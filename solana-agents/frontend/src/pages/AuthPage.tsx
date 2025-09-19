import React, { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { SignUpForm } from '../components/auth/SignUpForm'
import { Bot, Zap, Shield, TrendingUp } from 'lucide-react'

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)

  const toggleMode = () => setIsLogin(!isLogin)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Xade Agents</h1>
            <p className="text-xl text-gray-600">
              AI-Powered Solana Trading Bots
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI-Generated Strategies</h3>
                <p className="text-gray-600">
                  Create custom trading bots using natural language. Just describe your strategy and let AI generate the code.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Multiple Bot Types</h3>
                <p className="text-gray-600">
                  DCA bots for regular investing, Range bots for price-based trading, and Custom bots for complex strategies.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Secure & Reliable</h3>
                <p className="text-gray-600">
                  Built on AWS infrastructure with enterprise-grade security. Your funds and data are always protected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto w-full">
          {isLogin ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <SignUpForm onToggleMode={toggleMode} />
          )}
        </div>

        {/* Mobile branding */}
        <div className="lg:hidden mt-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Xade Agents</h1>
          <p className="text-gray-600 mt-2">AI-Powered Solana Trading Bots</p>
        </div>
      </div>
    </div>
  )
}
