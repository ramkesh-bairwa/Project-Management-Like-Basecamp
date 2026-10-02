// Deploys this app to the Hostinger VPS at https://project-crm.glamofashion.com
//
// Jenkins setup (one time):
//   Plugins:      Pipeline, Git, SSH Agent, Credentials Binding
//   Credentials:  vps-ssh-key      - "SSH Username with private key", user root, key authorised on the VPS
//                 project-crm-env  - "Secret file", the production .env.local (see deploy/README.md)
//   Agent tools:  ssh, rsync, curl
//   Job:          Pipeline script from SCM -> this repo, branch Ramkesh-Level-2
//
// Everything on the server (database, build, PM2, nginx, TLS) is done by
// deploy/remote-deploy.sh, so no manual server steps are needed.
pipeline {
    agent any

    environment {
        DEPLOY_HOST   = '187.126.117.103'
        DEPLOY_USER   = 'root'
        APP_ROOT      = '/var/www/project-crm'
        DOMAIN        = 'project-crm.glamofashion.com'
        APP_PORT      = '3100'
        PM2_APP_NAME  = 'project-crm'
        RELEASE       = "${env.BUILD_NUMBER}"
        SSH_OPTS      = '-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --oneline'
            }
        }

        stage('Upload release') {
            steps {
                sshagent(credentials: ['vps-ssh-key']) {
                    sh '''
                        ssh $SSH_OPTS $DEPLOY_USER@$DEPLOY_HOST \
                            "mkdir -p $APP_ROOT/releases/$RELEASE $APP_ROOT/shared && chmod 700 $APP_ROOT/shared"

                        rsync -az --delete -e "ssh $SSH_OPTS" \
                            --exclude='.git' --exclude='node_modules' --exclude='.next' \
                            --exclude='.env*' --exclude='*.dmg' --exclude='tsconfig.tsbuildinfo' \
                            ./ $DEPLOY_USER@$DEPLOY_HOST:$APP_ROOT/releases/$RELEASE/
                    '''
                }
            }
        }

        stage('Upload env') {
            steps {
                sshagent(credentials: ['vps-ssh-key']) {
                    withCredentials([file(credentialsId: 'project-crm-env', variable: 'ENV_FILE')]) {
                        sh '''
                            scp $SSH_OPTS "$ENV_FILE" $DEPLOY_USER@$DEPLOY_HOST:$APP_ROOT/shared/.env.local
                            ssh $SSH_OPTS $DEPLOY_USER@$DEPLOY_HOST "chmod 600 $APP_ROOT/shared/.env.local"
                        '''
                    }
                }
            }
        }

        stage('Migrate, build & start') {
            steps {
                sshagent(credentials: ['vps-ssh-key']) {
                    sh '''
                        ssh $SSH_OPTS $DEPLOY_USER@$DEPLOY_HOST \
                            "RELEASE=$RELEASE APP_ROOT=$APP_ROOT DOMAIN=$DOMAIN APP_PORT=$APP_PORT PM2_APP_NAME=$PM2_APP_NAME \
                             bash $APP_ROOT/releases/$RELEASE/deploy/remote-deploy.sh"
                    '''
                }
            }
        }

        stage('Health check') {
            steps {
                sh '''
                    for i in $(seq 1 10); do
                        if curl -fsS -o /dev/null "https://$DOMAIN/login"; then
                            echo "https://$DOMAIN is up"
                            exit 0
                        fi
                        sleep 5
                    done
                    echo "https://$DOMAIN did not respond"
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Build #${env.BUILD_NUMBER} deployed to https://${env.DOMAIN}"
        }
        failure {
            echo '❌ Deployment failed. The previous release keeps running unless it was the first deploy.'
        }
        always {
            cleanWs()
        }
    }
}
