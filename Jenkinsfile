pipeline {
    agent any

    environment {
        APP_NAME        = 'project-management'
        APP_DIR         = '/var/www/project-management'
        NODE_VERSION    = '20'
        PM2_APP_NAME    = 'project-management'
        GIT_REPO        = 'https://github.com/ramkesh-bairwa/Project-Management-Like-Basecamp.git'
        GIT_BRANCH      = 'main'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                echo '>>> Pulling latest code from Git...'
                git branch: "${GIT_BRANCH}",
                    url: "${GIT_REPO}",
                    credentialsId: 'github-credentials'
            }
        }

        stage('Setup Node.js') {
            steps {
                echo '>>> Setting up Node.js...'
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                    nvm use ${NODE_VERSION} || nvm install ${NODE_VERSION}
                    node --version
                    npm --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '>>> Installing npm dependencies...'
                sh 'npm ci --prefer-offline'
            }
        }

        stage('Lint') {
            steps {
                echo '>>> Running ESLint...'
                sh 'npm run lint || true'
            }
        }

        stage('Build') {
            steps {
                echo '>>> Building Next.js app...'
                withCredentials([file(credentialsId: 'env-file-project-management', variable: 'ENV_FILE')]) {
                    sh '''
                        cp $ENV_FILE .env.local
                        npm run build
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                echo '>>> Deploying to server...'
                sh '''
                    # Copy built files to app directory
                    rsync -av --delete \
                        --exclude='.git' \
                        --exclude='node_modules' \
                        ./ ${APP_DIR}/

                    # Install production dependencies on server
                    cd ${APP_DIR}
                    npm ci --omit=dev

                    # Restart app with PM2
                    pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1 \
                        && pm2 reload ${PM2_APP_NAME} --update-env \
                        || pm2 start ecosystem.config.js

                    pm2 save
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo '>>> Running health check...'
                sh '''
                    sleep 5
                    curl -f http://localhost:3000 || exit 1
                    echo "Health check passed!"
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Deployment successful!'
        }
        failure {
            echo '❌ Deployment failed!'
            // Uncomment below to send email notifications
            // mail to: 'team@example.com',
            //      subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            //      body: "Build failed. Check: ${env.BUILD_URL}"
        }
        always {
            cleanWs()
        }
    }
}
