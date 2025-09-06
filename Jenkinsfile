pipeline {
    agent {
        docker {
            image 'node:20-alpine'
        }
    }

    environment {
        FRONTEND_IMAGE = "registry.gitlab.com/mahdihm140/gitlab-release-automation/frontend"
    }

    stages {
       

        stage('Build Frontend') {
            steps {
                sh 'npm ci'
                sh 'npm run build -- --configuration=production'
            }
        }

        stage('Docker Build & Push Frontend') {
            steps {
                script {
                    docker.withRegistry('https://registry.gitlab.com', 'gitlab-docker-creds') {
                        docker.build("${FRONTEND_IMAGE}:${env.BUILD_NUMBER}").push()
                        docker.build("${FRONTEND_IMAGE}:latest").push()
                    }
                }
            }
        }
    }
}
