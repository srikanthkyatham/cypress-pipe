/// <reference types="cypress" />
/// <reference path="../../index.d.ts" />

const delay = 100 // delay of some retries. Make this larger if you want to see the UI during these times

describe('pipe()', () => {

  context('when passed a synchronous function', () => {
    it('should allow transforming a subject', () => {
      cy.wrap({ foo: 'bar' })
        .pipe(subject => subject.foo)
        .should('equal', 'bar')
    })

    it('should show the function name in the Command Log', (done) => {
      const getFoo = subject => subject.foo
      cy.on('log:added', (attrs, log) => {
        if (log.get('name') === 'pipe') {
          cy.removeAllListeners('log:added')

          expect(log.get('message')).to.eq('getFoo')
          expect(log.get('name')).to.eq('pipe')
          expect(log.invoke('consoleProps')).to.have.property('Command', 'pipe')
          done()
        }
      })

      cy.wrap({ foo: 'bar' })
        .pipe(getFoo)
    })

    it('should retry until assertion passes', () => {
      const obj = { foo: 'bar' }
      setTimeout(() => { obj.foo = 'baz' }, delay)
      cy.wrap(obj)
        .pipe(subject => subject.foo)
        .should('equal', 'baz')
    })

    it('should retry until errors are no longer thrown', () => {
      const obj = {}
      setTimeout(() => { obj.foo = { bar: 'baz' } }, delay)
      cy.wrap(obj)
        .pipe(subject => subject.foo.bar)
        .should('equal', 'baz')
    })
  
    it('should allow for a specified timeout', (done) => {
      const obj = { foo: 'bar' }
      setTimeout(() => { obj.foo = 'baz' }, delay)
      cy.wrap(obj)
        .pipe(subject => subject.foo, { timeout: 50 })
        .should('equal', 'baz')
        .then(s => {
          // we should not get here
          done(new Error('Failed to fail on timeout'))
        })
      
      cy.on('fail', (err) => {
        expect(err.message).to.include('Timed out retrying')
        expect(err.message).to.include("expected 'bar' to equal 'baz'")
        done()
      })
    })

    context('when visiting a page', () => {
      const getFirst = $el => $el.find('#first')
      const getSecond = $el => $el.find('#second')
      const getText = $el => $el.text()

      beforeEach(() => {
        cy.visit('/')
      })
  
      it('should have the correct element in the Command Log', () => {
        let lastLog

        cy.on('log:added', (attrs, log) => {
          if (log.get('name') === 'pipe') {
            lastLog = log
          }
        })

        cy.get('body')
          .pipe(getFirst)
          .should(() => {
            expect(lastLog.get('$el')).to.have.attr('id', 'first')
          })
      })

      it('should have the correct consoleProps', () => {
        let lastLog
        cy.on('log:added', (attrs, log) => {
          if (log.get('name') === 'pipe') {
            lastLog = log
          }
        })
        
        cy.get('body')
          .pipe(getFirst)
          .should(() => {
            const consoleProps = lastLog.invoke('consoleProps')

            expect(consoleProps).to.have.property('Elements', 1)
            expect(consoleProps.Yielded).to.have.id('first')
          })
      })

      it('should wait to continue for each step and resolve the chain with the correct value', () => {
        cy.get('body')
          .pipe(getFirst)
          .pipe(getSecond) // Will resolve after a delay
          .pipe(getText)
          .should('equal', 'foobar')
      })

      it('should create a snapshot', () => {
        let lastLog
        cy.on('log:added', (attrs, log) => {
          if (log.get('name') === 'pipe') {
            cy.removeAllListeners('log:added')

            lastLog = log
          }
        })

        cy.get('body')
          .pipe(getFirst)
          .then($el => {
            const snapshots = lastLog.get('snapshots')
            // snapshots only exist when running the GUI
            if (snapshots) {
              expect(lastLog.get('snapshots')).to.have.length(1)
            }
          })
      })
    })
  })

  context('when passed a function that uses cy commands', () => {
    it('should allow transforming a subject', () => {
      cy.wrap({ foo: 'bar' })
        .pipe(subject => cy.wrap(subject.foo))
        .should('equal', 'bar')
    })

    it('should show the function name in the Command Log', (done) => {
      const getFoo = subject => cy.wrap(subject.foo)
      cy.on('log:added', (attrs, log) => {
        if (log.get('name') === 'pipe') {
          cy.removeAllListeners('log:added')

          expect(log.get('message')).to.eq('getFoo')
          expect(log.get('name')).to.eq('pipe')
          expect(log.invoke('consoleProps')).to.have.property('Command', 'pipe')
          done()
        }
      })
      cy.wrap({ foo: 'bar' })
        .pipe(getFoo) // command log should show 'getFoo'
    })

    context('when visiting a page', () => {
      const getFirst = $el => cy.wrap($el).find('#first')
      const getSecond = $el => cy.wrap($el).find('#second')
      const getText = $el => $el.text()

      beforeEach(() => {
        cy.visit('/')
      })

      it('should have the correct element in the Command Log', () => {
        // This test is a little strange since snapshots show what element
        // is selected, but snapshots themselves don't give access to those
        // elements. I had to make the implementation specific so that the `$el`
        // is the `subject` when the log is added and the `$el` is the `value`
        // when the log is changed. It would be better to extract the `$el` from
        // each snapshot
        cy.on('log:added', (attrs, log) => {
          if (log.get('name') === 'pipe') {
            expect(log.get('$el')).to.have.prop('tagName', 'BODY')
          }
        })

        cy.on('log:changed', (attrs, log) => {
          if (log.get('name') === 'pipe') {
            expect(log.get('$el')).to.have.attr('id', 'first')
          }
        })

        cy.get('body')
          .pipe(getFirst)
      })

      it('should have the correct consoleProps', () => {
        let lastLog
        cy.on('log:added', (attrs, log) => {
          if (log.get('name') === 'pipe') {
            lastLog = log
          }
        })
        
        cy.get('body')
          .pipe(getFirst)
          .should(() => {
            const consoleProps = lastLog.invoke('consoleProps')

            expect(consoleProps).to.have.property('Elements', 1)
            expect(consoleProps.Yielded).to.have.id('first')
          })
      })
      
      it('should wait to continue for each step and resolve the chain with the correct value', () => {
        cy.get('body')
          .pipe(getFirst)
          .pipe(getSecond) // Will resolve after a delay
          .pipe(getText)
          .should('equal', 'foobar')
      })

      it('should create "before" and "after" snapshots', () => {
        let lastLog
        cy.on('log:added', (attrs, log) => {
          if (log.get('name') === 'pipe') {
            lastLog = log
          }
        })

        cy.get('body')
          .pipe(getFirst)
          .then($el => {
            const snapshots = lastLog.get('snapshots')
            // snapshots only exist when running the GUI
            if (snapshots) {
              expect(lastLog.get('snapshots')).to.have.length(2)
              expect(lastLog.get('snapshots')[0]).to.have.property('name', 'before')
              expect(lastLog.get('snapshots')[1]).to.have.property('name', 'after')
            }
          })
      })
    })
  })
})
